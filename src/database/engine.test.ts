import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_SQL } from '../data/dataset';
import { exercises } from '../data/exercises';
import { executeSql, readSchema } from './engine';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let db: Database;

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = new SQL.Database();
  db.run(SEED_SQL);
});

afterEach(() => db.close());

describe('本地 SQL 实验引擎', () => {
  it('加载默认数据，并保留 NULL 和外连接语义', () => {
    expect(readSchema(db).map((table) => table.name)).toEqual(['courses', 'scores', 'students']);
    const execution = executeSql(db, 'SELECT s.name, COUNT(sc.id) FROM students s LEFT JOIN scores sc ON sc.student_id = s.id GROUP BY s.id HAVING COUNT(sc.id) = 0;');
    expect(execution.error).toBeUndefined();
    expect(execution.results[0].values).toEqual([['江一', 0]]);
    expect(executeSql(db, 'SELECT city FROM students WHERE id = 5;').results[0].values).toEqual([[null]]);
  });

  it('正确解析字符串中的分号并返回多条结果', () => {
    const execution = executeSql(db, "SELECT 'hello;world' AS text; SELECT COUNT(*) AS total FROM students;");
    expect(execution.error).toBeUndefined();
    expect(execution.results.map((result) => result.values)).toEqual([[['hello;world']], [[12]]]);
  });

  it('在错误处停止，保留此前已生效的数据修改', () => {
    const execution = executeSql(db, "UPDATE students SET city = '北京' WHERE id = 1; SELECT missing FROM students; DELETE FROM students;");
    expect(execution.error).toContain('no such column');
    expect(execution.results).toHaveLength(1);
    expect(execution.results[0].affectedRows).toBe(1);
    expect(db.exec('SELECT city FROM students WHERE id = 1')[0].values).toEqual([['北京']]);
    expect(db.exec('SELECT COUNT(*) FROM students')[0].values).toEqual([[12]]);
  });

  it('支持事务回滚', () => {
    const execution = executeSql(db, "BEGIN; UPDATE students SET age = 99 WHERE id = 1; ROLLBACK; SELECT age FROM students WHERE id = 1;");
    expect(execution.error).toBeUndefined();
    expect(execution.results.at(-1)?.values).toEqual([[20]]);
  });

  it('限制大量查询结果，之后仍能执行查询', () => {
    const execution = executeSql(db, 'WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < 1000) SELECT n FROM nums;');
    expect(execution.error).toBeUndefined();
    expect(execution.results[0].values).toHaveLength(500);
    expect(execution.results[0].truncated).toBe(true);
    expect(executeSql(db, 'SELECT 1;').results[0].values).toEqual([[1]]);
  });

  it('在修改表结构后读取新表及字段', () => {
    expect(executeSql(db, 'CREATE TABLE "test table" (id INTEGER PRIMARY KEY, value TEXT);').error).toBeUndefined();
    expect(readSchema(db).find((table) => table.name === 'test table')?.columns).toMatchObject([
      { name: 'id', type: 'INTEGER', primaryKey: true, notNull: false },
      { name: 'value', type: 'TEXT', primaryKey: false, notNull: false },
    ]);
  });

  it('所有练习参考答案在默认数据上可执行', () => {
    for (const exercise of exercises) {
      const answerDb = new SQL.Database();
      try {
        answerDb.run(SEED_SQL);
        expect(executeSql(answerDb, exercise.answer).error, exercise.title).toBeUndefined();
      } finally {
        answerDb.close();
      }
    }
  });

  it('多语句解析失败保留失败编号及 SQL 起点，兼容注释与字符串分号', () => {
    const prefix = "-- 这是说明\nSELECT '分号;与中文';\n";
    const sql = `${prefix}SELECT missing FROM students; SELECT 3;`;
    const execution = executeSql(db, sql);
    expect(execution.failedStatement).toEqual({ index: 2, sql: sql.slice(prefix.length - 1), from: prefix.length - 1, to: sql.length, exact: false });
  });

  it('运行时约束错误只标出失败语句，返回非空、默认值和外键元数据', () => {
    const prefix = 'SELECT 1;';
    const failed = 'INSERT INTO students (id, name) VALUES (1, NULL);';
    const execution = executeSql(db, `${prefix}${failed}SELECT 3;`);
    expect(execution.failedStatement).toEqual({ index: 2, sql: failed, from: prefix.length, to: prefix.length + failed.length, exact: true });
    db.run("CREATE TABLE metadata_test (id INTEGER PRIMARY KEY, student_id INTEGER NOT NULL DEFAULT 1 REFERENCES students(id));");
    expect(readSchema(db).find((table) => table.name === 'metadata_test')?.columns[1]).toMatchObject({
      notNull: true, defaultValue: '1', references: [{ table: 'students', column: 'id' }],
    });
  });
});
