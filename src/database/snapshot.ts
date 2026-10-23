import type { Database, SqlJsStatic } from 'sql.js';
import { readSchema } from './engine';

function quoteIdentifier(name: string) {
  return `"${name.replaceAll('"', '""')}"`;
}

export function captureSnapshot(db: Database, SQL: SqlJsStatic): Uint8Array | undefined {
  // Keep unfinished transactions out of the durable snapshot.
  try {
    db.run('BEGIN;');
  } catch {
    return undefined;
  }
  db.run('ROLLBACK;');
  // Export a separate copy: exporting the live database resets connection state,
  // including temporary tables, PRAGMAs and last_insert_rowid().
  const copy = new SQL.Database();
  try {
    const tableInfo = db.exec('PRAGMA main.table_list;')[0]?.values ?? [];
    const shadowTables = new Set(tableInfo
      .filter((row) => row[2] === 'shadow').map((row) => String(row[1])));
    const definitions = db.exec(
      "SELECT type, name, sql FROM main.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name",
    )[0]?.values ?? [];
    const tables = definitions.filter(([type, name]) => type === 'table' && !shadowTables.has(String(name)));
    copy.run('BEGIN;');
    for (const [, name, definition] of tables) {
      const table = quoteIdentifier(String(name));
      copy.run(String(definition));
      const columns = db.exec(`PRAGMA main.table_xinfo(${table});`)[0].values
        .filter((column) => column[6] === 0).map((column) => quoteIdentifier(String(column[1])));
      const withoutRowid = tableInfo.find((row) => row[0] === 'main' && row[1] === name)?.[4] === 1;
      const rowid = ['_rowid_', 'rowid', 'oid'].find((alias) => !columns.some((column) => column.toLowerCase() === quoteIdentifier(alias)));
      if (!withoutRowid && rowid) columns.unshift(quoteIdentifier(rowid));
      const fields = columns.join(', ');
      const reader = db.prepare(`SELECT ${fields} FROM main.${table};`);
      const writer = copy.prepare(`INSERT INTO ${table} (${fields}) VALUES (${columns.map(() => '?').join(', ')});`);
      try {
        while (reader.step()) writer.run(reader.get());
      } finally {
        reader.free();
        writer.free();
      }
    }
    // Preserve AUTOINCREMENT high-water marks even when the latest row was deleted.
    if (copy.exec("SELECT 1 FROM main.sqlite_master WHERE name = 'sqlite_sequence';")[0]?.values.length) {
      copy.run('DELETE FROM sqlite_sequence;');
      for (const row of db.exec('SELECT name, seq FROM main.sqlite_sequence;')[0]?.values ?? []) {
        copy.run('INSERT INTO sqlite_sequence VALUES (?, ?);', row);
      }
    }
    for (const [type, , definition] of definitions) {
      if (type !== 'table') copy.run(String(definition));
    }
    copy.run('COMMIT;');
    return copy.export();
  } finally {
    copy.close();
  }
}

export function validateRestoredDatabase(db: Database) {
  const schema = readSchema(db);
  if (db.exec('PRAGMA quick_check;')[0]?.values.some(([value]) => value !== 'ok')) {
    throw new Error('数据库文件校验失败。');
  }
  db.run('PRAGMA foreign_keys = ON;');
  return schema;
}
