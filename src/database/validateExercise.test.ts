import initSqlJs from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { exercises } from '../data/exercises';
import { compareQueryResults, validateExercise } from './validateExercise';
import type { QueryResult } from './types';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => { SQL = await initSqlJs(); });

describe('独立默认库练习校验', () => {
  it('18 道查询题的参考答案均通过，重复运行不会污染数据', () => {
    for (const exercise of exercises.slice(0, 18)) {
      expect(validateExercise(SQL, exercise.id, exercise.answer), exercise.title).toMatchObject({ passed: true });
    }
    expect(validateExercise(SQL, 1, exercises[0].answer).passed).toBe(true);
  });

  it('接受不同查询写法与别名，无排序要求时忽略行顺序', () => {
    expect(validateExercise(SQL, 1, 'SELECT name AS 姓名, age AS 年龄, class_name AS 班级 FROM students ORDER BY id DESC;').passed).toBe(true);
    expect(validateExercise(SQL, 2, "WITH selected AS (SELECT * FROM students) SELECT * FROM selected WHERE city IN ('杭州');").passed).toBe(true);
  });

  it('排序题检查输出顺序，缺失字段或重复结果不能通过', () => {
    expect(validateExercise(SQL, 4, 'SELECT * FROM students ORDER BY age ASC, id;').passed).toBe(false);
    expect(validateExercise(SQL, 1, 'SELECT name FROM students;').message).toContain('3 列');
    expect(validateExercise(SQL, 1, `${exercises[0].answer.slice(0, -1)} UNION ALL SELECT name, age, class_name FROM students;`).passed).toBe(false);
  });

  it('拒绝多语句、修改操作与 SQL 错误，并保留后续校验可用', () => {
    for (const sql of [
      'PRAGMA query_only = OFF; DELETE FROM students; SELECT name, age, class_name FROM students;',
      'SELECT name, age, class_name FROM students; SELECT 1;',
      'WITH x AS (SELECT 1) DELETE FROM students RETURNING name, age, class_name;',
      'SELECT missing FROM students;',
    ]) expect(validateExercise(SQL, 1, sql).passed).toBe(false);
    expect(validateExercise(SQL, 1, exercises[0].answer).passed).toBe(true);
    expect(validateExercise(SQL, 19, exercises[18].answer).message).toContain('自主验证');
  });

  it('结果比较区分 NULL、文本、重复行，并拒绝截断结果', () => {
    const result: QueryResult = { sql: '', columns: ['x'], values: [[null], ['NULL'], [1], [1]], truncated: false, affectedRows: null };
    expect(compareQueryResults({ ...result, values: [[1], [null], [1], ['NULL']] }, result, false).passed).toBe(true);
    expect(compareQueryResults({ ...result, values: [[null], ['NULL'], [1], ['1']] }, result, false).passed).toBe(false);
    expect(compareQueryResults({ ...result, truncated: true }, result, false).passed).toBe(false);
  });
});
