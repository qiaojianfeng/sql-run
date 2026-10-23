export interface Exercise {
  id: number;
  title: string;
  topic: string;
  description: string;
  hint: string;
  answer: string;
}

export const exercises: Exercise[] = [
  {
    id: 1, title: '认识你的第一张表', topic: 'SELECT',
    description: '查询所有学生的姓名、年龄和班级。',
    hint: '在 SELECT 后列出需要的字段，用 FROM 指定 students 表。',
    answer: 'SELECT name, age, class_name FROM students;',
  },
  {
    id: 2, title: '找到杭州的同学', topic: 'WHERE',
    description: '查询来自杭州的学生，返回全部字段。',
    hint: "使用 WHERE city = '杭州'，文本值使用单引号。",
    answer: "SELECT * FROM students WHERE city = '杭州';",
  },
  {
    id: 3, title: '组合筛选条件', topic: 'AND',
    description: '查询计算机一班中年龄不小于 20 岁的学生。',
    hint: '用 AND 连接班级和年龄两个条件。',
    answer: "SELECT * FROM students WHERE class_name = '计算机一班' AND age >= 20;",
  },
  {
    id: 4, title: '按年龄排个队', topic: 'ORDER BY',
    description: '查询所有学生，按年龄从大到小排列，同龄按 id 升序排列。',
    hint: '降序使用 DESC，升序使用 ASC。',
    answer: 'SELECT * FROM students ORDER BY age DESC, id ASC;',
  },
  {
    id: 5, title: '成绩前三名', topic: 'LIMIT',
    description: '查询数据库原理（course_id = 1）成绩最高的 3 条记录，同分按 student_id 升序。',
    hint: '先筛选课程，再排序，最后 LIMIT 3。',
    answer: 'SELECT * FROM scores WHERE course_id = 1 ORDER BY score DESC, student_id ASC LIMIT 3;',
  },
  {
    id: 6, title: '同学来自哪里', topic: 'DISTINCT',
    description: '查询学生来自哪些城市，排除未知城市，去掉重复项。',
    hint: 'DISTINCT 可以去重，IS NOT NULL 可以排除空值。',
    answer: 'SELECT DISTINCT city FROM students WHERE city IS NOT NULL;',
  },
  {
    id: 7, title: '认识空值', topic: 'NULL',
    description: '找出没有填写城市的学生。',
    hint: '不要使用 = NULL，请使用 IS NULL。',
    answer: 'SELECT * FROM students WHERE city IS NULL;',
  },
  {
    id: 8, title: '看看及格区间', topic: 'BETWEEN',
    description: '查询分数在 60 到 80 之间的成绩记录，包含两端。',
    hint: 'BETWEEN 60 AND 80 包含 60 和 80。',
    answer: 'SELECT * FROM scores WHERE score BETWEEN 60 AND 80;',
  },
  {
    id: 9, title: '每班有多少人', topic: 'GROUP BY',
    description: '统计每个班级的学生人数。',
    hint: '按 class_name 分组，使用 COUNT(*) 统计。',
    answer: 'SELECT class_name, COUNT(*) AS student_count FROM students GROUP BY class_name;',
  },
  {
    id: 10, title: '课程平均分', topic: 'AVG',
    description: '统计各课程的平均分，保留一位小数。先返回课程 id 即可。',
    hint: '组合 ROUND(AVG(score), 1)，注意聚合函数会忽略 NULL。',
    answer: 'SELECT course_id, ROUND(AVG(score), 1) AS average_score FROM scores GROUP BY course_id;',
  },
  {
    id: 11, title: '找到高分课程', topic: 'HAVING',
    description: '找出平均分大于 85 的课程 id 及平均分。',
    hint: '分组后的筛选放在 HAVING 中。',
    answer: 'SELECT course_id, AVG(score) AS average_score FROM scores GROUP BY course_id HAVING AVG(score) > 85;',
  },
  {
    id: 12, title: '让成绩拥有姓名', topic: 'JOIN',
    description: '关联学生表和成绩表，显示学生姓名、课程 id 和成绩。',
    hint: '连接条件为 students.id = scores.student_id。',
    answer: 'SELECT s.name, sc.course_id, sc.score FROM students s JOIN scores sc ON s.id = sc.student_id;',
  },
  {
    id: 13, title: '一张完整的成绩单', topic: '多表关联',
    description: '关联三张表，显示学生姓名、课程名称和成绩。',
    hint: 'scores 通过 student_id 和 course_id 分别连接另两张表。',
    answer: 'SELECT s.name, c.name AS course_name, sc.score\nFROM scores sc\nJOIN students s ON s.id = sc.student_id\nJOIN courses c ON c.id = sc.course_id;',
  },
  {
    id: 14, title: '别漏掉没有成绩的人', topic: 'LEFT JOIN',
    description: '查询每名学生的姓名及成绩记录数量，包括没有成绩的学生。',
    hint: '以 students 为左表，用 COUNT(sc.id) 而不是 COUNT(*)。',
    answer: 'SELECT s.name, COUNT(sc.id) AS score_count\nFROM students s LEFT JOIN scores sc ON s.id = sc.student_id\nGROUP BY s.id, s.name;',
  },
  {
    id: 15, title: '还没有人选的课程', topic: 'NOT EXISTS',
    description: '找出在成绩表中没有任何记录的课程。',
    hint: '使用关联子查询，判断是否不存在该课程的成绩记录。',
    answer: 'SELECT * FROM courses c\nWHERE NOT EXISTS (SELECT 1 FROM scores sc WHERE sc.course_id = c.id);',
  },
  {
    id: 16, title: '超过平均水平', topic: '子查询',
    description: '查询分数超过所有有效成绩平均分的成绩记录。',
    hint: '在 WHERE 中用子查询计算整体平均分。',
    answer: 'SELECT * FROM scores WHERE score > (SELECT AVG(score) FROM scores);',
  },
  {
    id: 17, title: '给成绩加个标签', topic: 'CASE',
    description: '显示每条成绩及标签：空值为待补考，低于 60 为未及格，其余为及格。',
    hint: '用 CASE WHEN，先判断 IS NULL。',
    answer: "SELECT id, score,\n  CASE WHEN score IS NULL THEN '待补考'\n       WHEN score < 60 THEN '未及格'\n       ELSE '及格' END AS result\nFROM scores;",
  },
  {
    id: 18, title: '课程内的成绩排名', topic: '窗口函数',
    description: '对有效成绩按课程分别排名，分数从高到低，同分同名次，后续名次保留间隔。',
    hint: '使用 RANK() OVER (PARTITION BY course_id ORDER BY score DESC)。',
    answer: 'SELECT course_id, student_id, score,\n  RANK() OVER (PARTITION BY course_id ORDER BY score DESC) AS ranking\nFROM scores WHERE score IS NOT NULL;',
  },
  {
    id: 19, title: '试着修改一条数据', topic: 'UPDATE',
    description: '将林晓（id = 1）的城市改为北京，再查询该学生验证。实验后可以重置数据。',
    hint: 'UPDATE 时别忘记 WHERE，后接一条 SELECT 检查修改。',
    answer: "UPDATE students SET city = '北京' WHERE id = 1;\nSELECT * FROM students WHERE id = 1;",
  },
  {
    id: 20, title: '一次可以撤回的修改', topic: '事务',
    description: '开启事务，将 id = 1 的学生年龄增加 1，查看修改后回滚，并再次查询。',
    hint: 'BEGIN 开启事务，ROLLBACK 撤销事务内的修改。',
    answer: 'BEGIN;\nUPDATE students SET age = age + 1 WHERE id = 1;\nSELECT * FROM students WHERE id = 1;\nROLLBACK;\nSELECT * FROM students WHERE id = 1;',
  },
];
