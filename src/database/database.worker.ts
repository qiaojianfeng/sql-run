import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { SEED_SQL } from '../data/dataset';
import { executeSql, readSchema } from './engine';
import { importSql } from './importSql';
import { captureSnapshot, validateRestoredDatabase } from './snapshot';
import type { WorkerRequest, WorkerResponse } from './types';

let database: Database | undefined;
let runtime: Awaited<ReturnType<typeof initSqlJs>> | undefined;

function respond(response: WorkerResponse) {
  self.postMessage(response);
}

function snapshotState(db: Database, SQL: Awaited<ReturnType<typeof initSqlJs>>) {
  try {
    const snapshot = captureSnapshot(db, SQL);
    return { snapshot, transactionOpen: snapshot === undefined };
  } catch (error) {
    return {
      snapshotError: `快照未保存：${error instanceof Error ? error.message : String(error)}。请保留当前页面并检查表结构。`,
    };
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === 'init') {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });
      runtime = SQL;
      database?.close();
      database = new SQL.Database(event.data.data);
      let schema;
      if (event.data.data) schema = validateRestoredDatabase(database);
      else if (event.data.sql !== undefined) schema = importSql(database, event.data.sql);
      else {
        database.run(SEED_SQL);
        schema = readSchema(database);
      }
      respond({ type: 'ready', schema, ...snapshotState(database, SQL) });
      return;
    }

    if (!database || !runtime) {
      throw new Error('实验数据库尚未就绪。');
    }

    const execution = executeSql(database, event.data.sql);
    respond({
      type: 'executed', execution, schema: readSchema(database), ...snapshotState(database, runtime),
    });
  } catch (error) {
    respond({
      type: 'fatal',
      schema: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
