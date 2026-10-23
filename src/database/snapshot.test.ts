import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { SEED_SQL } from '../data/dataset';
import { executeSql } from './engine';
import { captureSnapshot, validateRestoredDatabase } from './snapshot';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
const opened: Database[] = [];

beforeAll(async () => { SQL = await initSqlJs(); });
afterEach(() => { opened.splice(0).forEach((db) => db.close()); });

function database(data?: Uint8Array) {
  const db = new SQL.Database(data);
  opened.push(db);
  return db;
}

describe('实验库快照', () => {
  it('保存默认库修改，恢复后保留数据、表结构和外键约束', () => {
    const db = database();
    db.run(SEED_SQL);
    db.run("UPDATE students SET city = '快照测试' WHERE id = 1;");
    const restored = database(captureSnapshot(db, SQL));
    expect(validateRestoredDatabase(restored).map((table) => table.name)).toEqual(['courses', 'scores', 'students']);
    expect(restored.exec('SELECT city FROM students WHERE id = 1;')[0].values).toEqual([['快照测试']]);
    expect(() => restored.run('INSERT INTO scores (student_id, course_id) VALUES (999, 999);')).toThrow();
  });

  it('不保存跨次运行的未提交事务，也不干扰回滚与提交', () => {
    const db = database();
    db.run('CREATE TABLE items (value TEXT); INSERT INTO items VALUES (\'before\');');
    const before = captureSnapshot(db, SQL);
    db.run("BEGIN; UPDATE items SET value = 'pending';");
    expect(captureSnapshot(db, SQL)).toBeUndefined();
    expect(database(before).exec('SELECT * FROM items;')[0].values).toEqual([['before']]);
    db.run('ROLLBACK;');
    expect(db.exec('SELECT * FROM items;')[0].values).toEqual([['before']]);
    db.run("BEGIN; UPDATE items SET value = 'committed'; COMMIT;");
    expect(database(captureSnapshot(db, SQL)).exec('SELECT * FROM items;')[0].values).toEqual([['committed']]);
  });

  it('保存机制不重置实时连接的临时表、PRAGMA 与 last_insert_rowid', () => {
    const db = database();
    db.run('PRAGMA foreign_keys = ON; CREATE TABLE items (id INTEGER PRIMARY KEY); INSERT INTO items VALUES (42); CREATE TEMP TABLE scratch (value TEXT);');
    captureSnapshot(db, SQL);
    expect(db.exec('SELECT last_insert_rowid();')[0].values).toEqual([[42]]);
    expect(db.exec('PRAGMA foreign_keys;')[0].values).toEqual([[1]]);
    expect(() => db.exec('SELECT * FROM scratch;')).not.toThrow();
  });

  it('保留生成列、触发器、视图、索引、BLOB 和自增序列', () => {
    const db = database();
    db.run(`
      CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, value INTEGER, doubled INTEGER GENERATED ALWAYS AS (value * 2) STORED, payload BLOB);
      CREATE TABLE audit (item_id INTEGER);
      CREATE TRIGGER log_insert AFTER INSERT ON items BEGIN INSERT INTO audit VALUES (NEW.id); END;
      CREATE INDEX item_value ON items(value);
      CREATE VIEW item_view AS SELECT id, doubled FROM items;
      INSERT INTO items (id, value, payload) VALUES (10, 3, X'0102');
      DELETE FROM items;
      INSERT INTO items (value, payload) VALUES (4, X'0304');
    `);
    const restored = database(captureSnapshot(db, SQL));
    expect(restored.exec('SELECT * FROM item_view;')[0].values).toEqual([[11, 8]]);
    expect(restored.exec('SELECT hex(payload) FROM items;')[0].values).toEqual([['0304']]);
    restored.run('INSERT INTO items (value) VALUES (5);');
    expect(restored.exec('SELECT item_id FROM audit ORDER BY item_id;')[0].values).toEqual([[10], [11], [12]]);
  });

  it('错误前已生效的修改也可保存，清空全部表后仍能恢复', () => {
    const db = database();
    db.run('CREATE TABLE items (id INTEGER);');
    const result = executeSql(db, 'INSERT INTO items VALUES (1); SELECT missing FROM items;');
    expect(result.error).toBeDefined();
    expect(database(captureSnapshot(db, SQL)).exec('SELECT * FROM items;')[0].values).toEqual([[1]]);
    db.run('DROP TABLE items;');
    expect(validateRestoredDatabase(database(captureSnapshot(db, SQL)))).toEqual([]);
  });

  it('保留隐式 rowid，兼容 WITHOUT ROWID 与表名中的引号', () => {
    const db = database();
    db.run(`
      CREATE TABLE notes (content TEXT);
      INSERT INTO notes (rowid, content) VALUES (42, 'keep rowid');
      CREATE TABLE "quoted""table" (code TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID;
      INSERT INTO "quoted""table" VALUES ('a', 'quoted name');
    `);
    const restored = database(captureSnapshot(db, SQL));
    expect(restored.exec('SELECT rowid, content FROM notes;')[0].values).toEqual([[42, 'keep rowid']]);
    expect(restored.exec('SELECT * FROM "quoted""table";')[0].values).toEqual([['a', 'quoted name']]);
  });
});
