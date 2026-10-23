import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { importSql, MAX_IMPORT_BYTES } from './importSql';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let db: Database;

beforeAll(async () => { SQL = await initSqlJs(); });
beforeEach(() => { db = new SQL.Database(); });
afterEach(() => db.close());

describe('SQL 数据库导入', () => {
  it('导入带 BOM、注释、分号字符串及关联数据的脚本', () => {
    const schema = importSql(db, `\uFEFF-- 自定义数据\n
      CREATE TABLE teams (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE members (id INTEGER PRIMARY KEY, team_id INTEGER REFERENCES teams(id));
      INSERT INTO teams VALUES (1, '设计;研发');
      INSERT INTO members VALUES (1, 1);
    `);
    expect(schema.map((table) => table.name)).toEqual(['members', 'teams']);
    expect(db.exec('SELECT name FROM teams')[0].values).toEqual([['设计;研发']]);
  });

  it('支持完整事务并拒绝未结束的事务', () => {
    expect(importSql(db, 'BEGIN; CREATE TABLE notes (id INTEGER); COMMIT;')[0].name).toBe('notes');
    expect(() => importSql(db, 'BEGIN; INSERT INTO notes VALUES (1);')).toThrow('transaction');
  });

  it('错误文件不影响独立的原实验库', () => {
    const original = new SQL.Database();
    try {
      original.run('CREATE TABLE original (id INTEGER); INSERT INTO original VALUES (7);');
      expect(() => importSql(db, 'CREATE TABLE test (id INTEGER); INSERT INTO missing VALUES (1);')).toThrow('no such table: missing');
      expect(original.exec('SELECT * FROM original')[0].values).toEqual([[7]]);
    } finally {
      original.close();
    }
  });

  it('拒绝空文件、无表脚本及过大的 UTF-8 内容', () => {
    expect(() => importSql(db, '   ')).toThrow('为空');
    expect(() => importSql(db, '-- comments only')).toThrow('未找到数据表');
    expect(() => importSql(db, '中'.repeat(Math.ceil(MAX_IMPORT_BYTES / 3)))).toThrow('2 MB');
  });

  it('校验脚本关闭外键检查后写入的无效引用', () => {
    expect(() => importSql(db, `
      PRAGMA foreign_keys = OFF;
      CREATE TABLE parent (id INTEGER PRIMARY KEY);
      CREATE TABLE child (parent_id INTEGER REFERENCES parent(id));
      INSERT INTO child VALUES (99);
    `)).toThrow('外键引用错误');
  });

  it('拒绝超出语句数量限制的脚本', () => {
    expect(() => importSql(db, 'CREATE TABLE numbers (id INTEGER);' + 'INSERT INTO numbers VALUES (1);'.repeat(2000))).toThrow('2,000');
  });
});
