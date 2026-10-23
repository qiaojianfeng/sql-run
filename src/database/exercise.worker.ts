import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { validateExercise } from './validateExercise';

self.onmessage = async (event: MessageEvent<{ id: number; sql: string }>) => {
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    self.postMessage(validateExercise(SQL, event.data.id, event.data.sql));
  } catch (error) {
    self.postMessage({ passed: false, message: `校验引擎异常：${error instanceof Error ? error.message : String(error)}` });
  }
};
