import type { Database } from 'sql.js';
import { readSchema } from './engine';

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

// Import into a new database only. The caller publishes it after every step succeeds.
export function importSql(db: Database, source: string) {
  const sql = source.replace(/^\uFEFF/, '');
  if (!sql.trim()) throw new Error('SQL 内容为空，请选择文件或粘贴建表语句。');
  if (new TextEncoder().encode(sql).length > MAX_IMPORT_BYTES) {
    throw new Error('SQL 文件最大支持 2 MB，请精简后再导入。');
  }

  db.run('PRAGMA foreign_keys = ON;');
  let count = 0;
  try {
    for (const statement of db.iterateStatements(sql)) {
      count += 1;
      if (count > 2000) throw new Error('最多支持 2,000 条语句，请拆分或精简文件。');
      statement.run();
    }
    // An unfinished transaction must not become the user's new workspace.
    db.run('BEGIN; ROLLBACK;');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`导入失败：${message}`);
  }

  const schema = readSchema(db);
  if (schema.length === 0) throw new Error('未找到数据表，请在 SQL 中包含 CREATE TABLE。');
  const violations = db.exec('PRAGMA foreign_key_check;');
  if (violations[0]?.values.length) throw new Error('数据存在外键引用错误，请检查关联数据。');
  db.run('PRAGMA foreign_keys = ON;');
  return schema;
}
