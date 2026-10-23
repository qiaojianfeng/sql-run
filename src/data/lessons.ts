import { lessonDetails } from './lessonDetails';

export interface LessonSection {
  title: string;
  text: string;
  items?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface Lesson {
  id: string;
  category: string;
  title: string;
  summary: string;
  sections: LessonSection[];
  sql: string;
  note: string;
}

const introductions: Lesson[] = [
  {
    id: 'select', category: '查询基础', title: 'SELECT：读取你的第一张表',
    summary: '认识表、行和列，选择字段并为结果起一个清晰的名字。',
    sections: [
      { title: '表、行与列', text: '`students` 表的一行代表一名学生，`name`、`age` 等列描述学生的属性。`SELECT` 指定要返回的列，`FROM` 指定数据来源。SQL 关键字通常大写，便于阅读。' },
      { title: '选择列与别名', text: '`SELECT *` 返回全部字段，探索数据时很方便；正式查询建议列出字段。`AS` 可以为结果列命名，别名不会修改原始表结构。语句以分号结束，文本值使用单引号。' },
    ],
    sql: 'SELECT id, name AS 姓名, age AS 年龄, class_name AS 班级\nFROM students;',
    note: '本页示例均使用默认学生成绩库。若修改过表或数据，可以先到实验台重置。',
  },
  {
    id: 'where', category: '查询基础', title: 'WHERE：筛选需要的数据',
    summary: '使用比较、逻辑运算和模糊匹配表达筛选条件。',
    sections: [
      { title: '比较与组合条件', text: '`=`、`<>`、`>`、`>=`、`<`、`<=` 用于比较。`AND` 要求条件同时成立，`OR` 要求至少一个成立，`NOT` 取反。`AND` 的优先级高于 `OR`，混合条件时使用括号更清楚。' },
      { title: '范围、集合与模糊查询', text: '`BETWEEN 20 AND 22` 包含两个端点；`IN` 可以匹配多个候选值。`LIKE` 中 `%` 代表任意数量字符，`_` 代表一个字符。模糊匹配是否区分大小写受数据库配置影响。' },
    ],
    sql: "SELECT name, age, city\nFROM students\nWHERE age BETWEEN 20 AND 22\n  AND (city IN ('杭州', '上海') OR name LIKE '程%');",
    note: 'WHERE 在分组前筛选原始行，不能直接用它筛选 AVG 等聚合结果。',
  },
  {
    id: 'null', category: '查询基础', title: 'NULL 与 DISTINCT：空值和去重',
    summary: '区分未知值、空字符串和零，理解去重的作用范围。',
    sections: [
      { title: '空值需要专门判断', text: '`NULL` 表示缺失或未知，不等于数字 `0`，也不等于空字符串。使用 `IS NULL` 或 `IS NOT NULL` 判断；`= NULL` 和 `<> NULL` 不会得到通常预期的筛选结果。' },
      { title: '去重与默认值', text: '`DISTINCT` 对选择的所有列组合去重，而不是只针对第一列。`COALESCE(city, \'未知\')` 返回第一个非 NULL 值，适合展示默认文字。`COUNT(*)` 包含所有行，`COUNT(city)` 只计算非空城市。' },
    ],
    sql: "SELECT name, COALESCE(city, '未知') AS 城市\nFROM students\nWHERE city IS NULL;\n\nSELECT DISTINCT city FROM students WHERE city IS NOT NULL;",
    note: 'NULL 参与普通比较时结果通常也是未知；在 WHERE 中只有条件为真的行才会被保留。',
  },
  {
    id: 'order', category: '查询基础', title: 'ORDER BY 与 LIMIT：排序和分页',
    summary: '稳定地选出前几条记录，避免依赖数据库的默认顺序。',
    sections: [
      { title: '显式指定排序', text: '没有 `ORDER BY` 的结果顺序没有保证。`ASC` 为升序，`DESC` 为降序。多个排序字段依次生效；如果分数相同，增加唯一 `id` 作为第二排序字段可以稳定结果。' },
      { title: '限制返回条数', text: '`LIMIT 5` 返回前五行，`LIMIT 5 OFFSET 5` 跳过前五行再返回五行。分页通常需要配合稳定排序。大偏移量的分页可能较慢，后续可以学习按主键范围分页。' },
    ],
    sql: 'SELECT student_id, course_id, score\nFROM scores\nWHERE score IS NOT NULL\nORDER BY score DESC, id ASC\nLIMIT 5 OFFSET 0;',
    note: '需要明确将空值放最后时，可使用 `ORDER BY score IS NULL, score DESC, id ASC`，把展示意图写进排序表达式。',
  },
  {
    id: 'group', category: '统计与关联', title: 'GROUP BY 与 HAVING：分组统计',
    summary: '使用 COUNT、AVG、SUM、MIN 和 MAX 汇总多行数据。',
    sections: [
      { title: '从明细到汇总', text: '`GROUP BY` 把相同分组键的记录放在一起。`COUNT` 统计数量，`AVG` 求平均，`SUM` 求和，`MIN` 和 `MAX` 求最小最大值。除 `COUNT(*)` 外，这些常用聚合函数会忽略 `NULL`。' },
      { title: '区分 WHERE 与 HAVING', text: '`WHERE` 先筛选明细，`HAVING` 再筛选分组后的结果。查询中不参与聚合的字段应放入 `GROUP BY`，避免利用 SQLite 较宽松的规则写出在 MySQL `ONLY_FULL_GROUP_BY` 模式下失败的查询。' },
    ],
    sql: 'SELECT course_id, COUNT(score) AS 有效成绩数,\n       ROUND(AVG(score), 1) AS 平均分\nFROM scores\nGROUP BY course_id\nHAVING AVG(score) > 80\nORDER BY 平均分 DESC;',
    note: '理解顺序可以参考 FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。这是逻辑处理顺序，不是引擎实际执行计划。',
  },
  {
    id: 'join', category: '统计与关联', title: 'JOIN：连接多张表',
    summary: '通过学生、课程和成绩之间的关系生成完整成绩单。',
    sections: [
      { title: '用键建立关系', text: '`scores.student_id` 指向 `students.id`，`scores.course_id` 指向 `courses.id`。`JOIN` 的 `ON` 子句描述连接条件。用 `s`、`sc`、`c` 等表别名可以减少重复并明确字段来源。' },
      { title: '内连接与左连接', text: '`INNER JOIN` 只保留能匹配的记录；`LEFT JOIN` 保留左表全部记录，右表没有匹配时填入 `NULL`。左连接后在 `WHERE` 中要求右表字段满足条件，可能会把原本保留的未匹配记录过滤掉。' },
    ],
    sql: 'SELECT s.name AS 姓名, c.name AS 课程, sc.score AS 成绩\nFROM students s\nLEFT JOIN scores sc ON sc.student_id = s.id\nLEFT JOIN courses c ON c.id = sc.course_id\nORDER BY s.id, c.id;',
    note: '连接是一对多时，左表一行会对应多行结果。不要误把连接产生的多行当成重复错误。',
  },
  {
    id: 'subquery', category: '统计与关联', title: '子查询与 EXISTS：把查询作为条件',
    summary: '比较整体平均水平，找出没有匹配记录的数据。',
    sections: [
      { title: '标量子查询', text: '标量子查询返回一行一列，可用于与单个值比较。例如先计算整体 `AVG(score)`，再选出超过平均分的成绩。用于单值比较的子查询应确保只返回一个值。' },
      { title: '存在性判断', text: '`EXISTS` 判断子查询是否至少返回一行；`NOT EXISTS` 判断没有任何匹配行。相关子查询通过外层表别名关联当前记录。`NOT IN` 的子查询若包含 `NULL`，可能产生不符合直觉的结果，可优先考虑 `NOT EXISTS`。' },
    ],
    sql: 'SELECT * FROM scores\nWHERE score > (SELECT AVG(score) FROM scores);\n\nSELECT c.name\nFROM courses c\nWHERE NOT EXISTS (\n  SELECT 1 FROM scores sc WHERE sc.course_id = c.id\n);',
    note: '子查询不一定比 JOIN 慢，应结合实际数据和真实 MySQL 执行计划判断。',
  },
  {
    id: 'case', category: '进阶查询', title: 'CASE 与常用函数：转换查询结果',
    summary: '为成绩分类，处理空值和数值展示。',
    sections: [
      { title: '条件表达式', text: '`CASE` 按顺序判断 `WHEN`，命中第一条为真的条件后返回对应 `THEN` 值。`ELSE` 定义默认结果，没有 ELSE 且没有条件命中时返回 `NULL`。CASE 是表达式，可以放入 SELECT、排序和聚合表达式。' },
      { title: '常用函数', text: '`ROUND(value, 1)` 四舍五入到一位小数，`COALESCE` 处理空值，`UPPER` 和 `LOWER` 转换字母大小写。日期和字符串函数差异较多：MySQL 使用 `DATE_FORMAT` 等函数，本地 SQLite 的写法不能直接等同。' },
    ],
    sql: "SELECT student_id, score,\n  CASE\n    WHEN score IS NULL THEN '待补考'\n    WHEN score >= 90 THEN '优秀'\n    WHEN score >= 60 THEN '及格'\n    ELSE '未及格'\n  END AS 等级\nFROM scores;",
    note: '先判断 NULL，再判断分数范围，可以让分支含义更明确。',
  },
  {
    id: 'cte', category: '进阶查询', title: 'CTE 与窗口函数：整理复杂查询',
    summary: '用 WITH 命名中间结果，用排名函数保留行级明细。',
    sections: [
      { title: '命名中间结果', text: '`WITH` 定义只在当前语句中可用的公共表表达式（CTE），可以将复杂查询拆成易读的步骤。它不是永久表，也不意味着一定会产生物化临时表。MySQL 8.0 及以上支持 CTE。' },
      { title: '窗口内排名', text: '窗口函数不会像 `GROUP BY` 一样把多行压缩为一行。`PARTITION BY` 指定分区，窗口内 `ORDER BY` 指定排名顺序。`ROW_NUMBER` 每行一个序号，`RANK` 同分同名次且留间隔，`DENSE_RANK` 同分同名次但不留间隔。' },
    ],
    sql: 'WITH valid_scores AS (\n  SELECT student_id, course_id, score\n  FROM scores WHERE score IS NOT NULL\n)\nSELECT student_id, course_id, score,\n  RANK() OVER (PARTITION BY course_id ORDER BY score DESC) AS 名次\nFROM valid_scores\nORDER BY course_id, 名次, student_id;',
    note: 'MySQL 8.0 及以上支持窗口函数。RANK 的排序条件中加入唯一 id 会打破同分并列，需要与最终结果排序区分。',
  },
  {
    id: 'write', category: '数据与结构', title: 'INSERT、UPDATE、DELETE：修改数据',
    summary: '练习新增和修改数据，并养成先查询确认范围的习惯。',
    sections: [
      { title: '新增记录', text: '`INSERT INTO` 后写表名和明确的字段列表，`VALUES` 中的值与字段顺序一致。主键必须唯一，外键引用的目标应存在，数据还需满足 `NOT NULL`、`UNIQUE` 和 `CHECK` 等约束。' },
      { title: '限制修改范围', text: '`UPDATE` 用 `SET` 指定新值，`DELETE FROM` 删除记录。没有 `WHERE` 时会影响所有行。执行前先用相同 WHERE 写 SELECT 检查目标；执行后再次查询确认。已提交的修改会保存在本地，刷新不能代替撤销；重置前请按需导出备份。' },
    ],
    sql: "BEGIN;\nINSERT INTO students (id, name, gender, age, class_name, city, enrolled_at)\nVALUES (100, '测试同学', '女', 20, '计算机一班', '北京', '2025-09-01');\nUPDATE students SET age = 21 WHERE id = 100;\nSELECT * FROM students WHERE id = 100;\nDELETE FROM students WHERE id = 100;\nROLLBACK;",
    note: '示例用事务回滚清理修改。若执行中遇错，后面的 ROLLBACK 不会自动运行，请手动回滚或重置实验库。',
  },
  {
    id: 'transaction', category: '数据与结构', title: '事务：让一组修改共同完成',
    summary: '理解 BEGIN、COMMIT 与 ROLLBACK 的作用。',
    sections: [
      { title: '提交或撤销', text: '事务将一组操作作为一个工作单元。`BEGIN` 开启，`COMMIT` 提交，`ROLLBACK` 撤销尚未提交的修改。MySQL 通常也可以使用 `START TRANSACTION`。提交之后再执行 ROLLBACK 不能撤回已经提交的数据。' },
      { title: 'ACID 与实验边界', text: 'ACID 分别指原子性、一致性、隔离性和持久性。事务行为取决于数据库和存储引擎。这里使用单连接 SQLite，不能用于验证 MySQL InnoDB 的隔离级别、行锁、死锁或并发可见性。' },
    ],
    sql: 'BEGIN;\nUPDATE students SET age = age + 1 WHERE id = 1;\nSELECT name, age FROM students WHERE id = 1;\nROLLBACK;\nSELECT name, age FROM students WHERE id = 1;',
    note: 'MySQL 的许多 DDL 会隐式提交，不能将本地 SQLite 的 DDL 回滚结果套用到 MySQL。刷新、停止或超时恢复使用最近已保存的提交快照，当前运行和未提交修改不会保留。',
  },
  {
    id: 'schema', category: '数据与结构', title: '建表、约束与索引',
    summary: '认识主键、外键、唯一约束与索引的用途。',
    sections: [
      { title: '用约束表达规则', text: '`PRIMARY KEY` 唯一标识记录，`NOT NULL` 禁止空值，`UNIQUE` 防止重复，`FOREIGN KEY` 表达引用关系，`CHECK` 校验条件。SQLite 的类型系统比 MySQL 宽松，`VARCHAR(n)` 不会像 MySQL 那样限制长度。' },
      { title: '索引不是越多越好', text: '索引可以帮助定位记录，但占用存储并增加写入成本。联合索引的字段顺序与查询条件有关，是否使用索引由优化器决定。真实 MySQL 可用 `EXPLAIN` 分析计划，本地 SQLite 应使用 `EXPLAIN QUERY PLAN`，两者字段和含义不同。' },
    ],
    sql: 'CREATE TABLE IF NOT EXISTS study_notes (\n  id INTEGER PRIMARY KEY,\n  title VARCHAR(100) NOT NULL,\n  student_id INTEGER REFERENCES students(id)\n);\nCREATE INDEX IF NOT EXISTS idx_notes_student ON study_notes(student_id);\nSELECT * FROM study_notes;',
    note: '这里演示 SQLite 可运行的建表语法。MySQL 自增通常写 BIGINT PRIMARY KEY AUTO_INCREMENT，CREATE INDEX 也不能直接照搬此处的 IF NOT EXISTS 写法。',
  },
];

export const lessons = introductions.map((lesson) => {
  const details = lessonDetails[lesson.id];
  return {
    ...lesson,
    ...details,
    sections: [...lesson.sections, ...details.sections],
  };
});
