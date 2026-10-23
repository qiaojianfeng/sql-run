export const INITIAL_SQL = `-- 从一个问题开始：每位同学的平均成绩是多少？
SELECT
  s.name AS 姓名,
  s.class_name AS 班级,
  ROUND(AVG(sc.score), 1) AS 平均成绩
FROM students AS s
LEFT JOIN scores AS sc ON sc.student_id = s.id
GROUP BY s.id, s.name, s.class_name
ORDER BY 平均成绩 DESC;`;

export const SEED_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE students (
  id INTEGER PRIMARY KEY, -- 学生编号
  name VARCHAR(30) NOT NULL, -- 学生姓名
  gender VARCHAR(2) NOT NULL, -- 性别
  age INTEGER NOT NULL, -- 年龄（岁）
  class_name VARCHAR(30) NOT NULL, -- 所属班级
  city VARCHAR(30), -- 所在城市，允许为空
  enrolled_at DATE NOT NULL -- 入学日期
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY, -- 课程编号
  name VARCHAR(40) NOT NULL, -- 课程名称
  teacher VARCHAR(30) NOT NULL, -- 任课教师
  credit INTEGER NOT NULL -- 课程学分
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY, -- 成绩记录编号
  student_id INTEGER NOT NULL REFERENCES students(id), -- 学生编号，关联 students.id
  course_id INTEGER NOT NULL REFERENCES courses(id), -- 课程编号，关联 courses.id
  score DECIMAL(5, 1) CHECK (score BETWEEN 0 AND 100), -- 考试分数（0～100），空值表示待补考
  exam_date DATE NOT NULL, -- 考试日期
  UNIQUE (student_id, course_id)
);

INSERT INTO students VALUES
  (1, '林晓', '女', 20, '计算机一班', '杭州', '2024-09-01'),
  (2, '陈宇', '男', 21, '计算机一班', '上海', '2024-09-01'),
  (3, '周可', '女', 20, '计算机二班', '成都', '2024-09-01'),
  (4, '许言', '男', 22, '计算机二班', '杭州', '2023-09-01'),
  (5, '苏然', '女', 21, '计算机一班', NULL, '2024-09-01'),
  (6, '陆远', '男', 20, '计算机二班', '南京', '2024-09-01'),
  (7, '沈悦', '女', 19, '计算机一班', '苏州', '2025-09-01'),
  (8, '顾辰', '男', 21, '计算机二班', '上海', '2024-09-01'),
  (9, '叶宁', '女', 20, '计算机一班', '杭州', '2024-09-01'),
  (10, '江一', '男', 19, '计算机二班', NULL, '2025-09-01'),
  (11, '宋乔', '女', 22, '计算机一班', '南京', '2023-09-01'),
  (12, '程墨', '男', 20, '计算机二班', '成都', '2024-09-01');

INSERT INTO courses VALUES
  (1, '数据库原理', '张老师', 4),
  (2, '高等数学', '李老师', 4),
  (3, '程序设计', '王老师', 3),
  (4, '计算机网络', '赵老师', 3),
  (5, '人工智能导论', '刘老师', 2);

INSERT INTO scores VALUES
  (1, 1, 1, 95, '2025-06-10'), (2, 1, 2, 88, '2025-06-12'),
  (3, 1, 3, 92, '2025-06-15'), (4, 2, 1, 82, '2025-06-10'),
  (5, 2, 2, 76, '2025-06-12'), (6, 2, 3, 90, '2025-06-15'),
  (7, 3, 1, 95, '2025-06-10'), (8, 3, 2, 91, '2025-06-12'),
  (9, 3, 4, 87, '2025-06-18'), (10, 4, 1, 58, '2025-06-10'),
  (11, 4, 2, 65, '2025-06-12'), (12, 4, 4, 72, '2025-06-18'),
  (13, 5, 1, 89, '2025-06-10'), (14, 5, 3, 94, '2025-06-15'),
  (15, 6, 2, 55, '2025-06-12'), (16, 6, 3, 78, '2025-06-15'),
  (17, 7, 1, 91, '2025-06-10'), (18, 7, 2, 91, '2025-06-12'),
  (19, 8, 1, 67, '2025-06-10'), (20, 8, 4, 80, '2025-06-18'),
  (21, 9, 1, 88, '2025-06-10'), (22, 9, 3, 92, '2025-06-15'),
  (23, 11, 2, 96, '2025-06-12'), (24, 11, 4, 90, '2025-06-18'),
  (25, 12, 1, NULL, '2025-06-10'), (26, 12, 3, 83, '2025-06-15');

CREATE INDEX idx_scores_student ON scores(student_id);
CREATE INDEX idx_scores_course ON scores(course_id);
`;

export const TABLE_DESCRIPTIONS: Record<string, string> = {
  students: '学生信息',
  courses: '课程信息',
  scores: '考试成绩',
};

export const FIELD_COMMENTS: Record<string, Record<string, string>> = {
  students: {
    id: '学生编号',
    name: '学生姓名',
    gender: '性别',
    age: '年龄（岁）',
    class_name: '所属班级',
    city: '所在城市，允许为空',
    enrolled_at: '入学日期',
  },
  courses: {
    id: '课程编号',
    name: '课程名称',
    teacher: '任课教师',
    credit: '课程学分',
  },
  scores: {
    id: '成绩记录编号',
    student_id: '学生编号，关联 students.id',
    course_id: '课程编号，关联 courses.id',
    score: '考试分数（0～100），空值表示待补考',
    exam_date: '考试日期',
  },
};
