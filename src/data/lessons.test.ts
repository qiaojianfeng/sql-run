import initSqlJs, { type Database } from 'sql.js';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { executeSql } from '../database/engine';
import { SEED_SQL } from './dataset';
import { lessons } from './lessons';

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

describe('学习文档示例与讲解', () => {
  it.each(lessons)('$title 示例在独立默认库中可运行', (lesson) => {
    expect(executeSql(db, lesson.sql).error).toBeUndefined();
  });

  it('筛选、空值和外连接的观察说明符合默认数据', () => {
    const where = lessons.find((lesson) => lesson.id === 'where')!;
    expect(executeSql(db, where.sql).results[0].values.map((row) => row[0]).sort()).toEqual(
      ['林晓', '陈宇', '许言', '顾辰', '叶宁', '程墨'].sort(),
    );
    expect(db.exec('SELECT COUNT(*), COUNT(city), COUNT(DISTINCT city) FROM students;')[0].values).toEqual([[12, 10, 5]]);
    const join = lessons.find((lesson) => lesson.id === 'join')!;
    const rows = executeSql(db, join.sql).results[0].values;
    expect(rows).toHaveLength(27);
    expect(rows).toContainEqual(['江一', null, null]);
  });

  it('排名与不存在关联的结果符合讲解', () => {
    const cte = lessons.find((lesson) => lesson.id === 'cte')!;
    expect(executeSql(db, cte.sql).results[0].values.slice(0, 3)).toEqual([
      [1, 1, 95, 1], [3, 1, 95, 1], [7, 1, 91, 3],
    ]);
    const subquery = lessons.find((lesson) => lesson.id === 'subquery')!;
    expect(executeSql(db, subquery.sql).results[1].values).toEqual([['人工智能导论']]);
  });

  it.each(['write', 'transaction'])('%s 的完整示例不会留下数据修改', (id) => {
    const before = db.exec('SELECT * FROM students ORDER BY id;');
    const lesson = lessons.find((item) => item.id === id)!;
    expect(executeSql(db, lesson.sql).error).toBeUndefined();
    expect(db.exec('SELECT * FROM students ORDER BY id;')).toEqual(before);
  });
});
