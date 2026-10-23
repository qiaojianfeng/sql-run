---
id: "join"
order: 6
category: "统计与关联"
summary: "通过学生、课程和成绩之间的关系生成完整成绩单。"
---

# JOIN：连接多张表

## 学习目标

- 沿外键建立关联
- 根据主体选择连接方式
- 识别一对多和外连接筛选陷阱

## 用键建立关系

`scores.student_id` 指向 `students.id`，`scores.course_id` 指向 `courses.id`。`JOIN` 的 `ON` 子句描述连接条件。用 `s`、`sc`、`c` 等表别名可以减少重复并明确字段来源。

## 内连接与左连接

`INNER JOIN` 只保留能匹配的记录；`LEFT JOIN` 保留左表全部记录，右表没有匹配时填入 `NULL`。左连接后在 `WHERE` 中要求右表字段满足条件，可能会把原本保留的未匹配记录过滤掉。

## 先决定哪些记录必须保留

只查看已有成绩的人，可以从内连接开始；希望所有学生都出现，应以学生表为左表做左连接。表别名能帮助你随时看出字段来源，例如 `s.name` 与 `c.name`。

| 连接方式 | 保留规则 | 常见用途 |
| --- | --- | --- |
| `INNER JOIN` / `JOIN` | 只保留匹配的记录 | 已产生的成绩单 |
| `LEFT JOIN` | 左表全保留，右侧未匹配处为 NULL | 包含未考试学生的名单 |
| `CROSS JOIN` | 两表所有行的组合 | 生成学生与课程的全部候选组合 |

## ON 与 WHERE 不是任意交换的

需求若是“显示所有学生，只带出及格成绩”，可把 `sc.score >= 60` 放在 `LEFT JOIN` 的 `ON` 中。没有及格成绩的学生仍然保留，只是右侧为 NULL。放进 `WHERE` 后，未匹配行无法通过比较，学生也会消失。

一位学生有三门成绩，连接后就会出现三行姓名相同的记录，这是一对多的正常结果。不要用 DISTINCT 掩盖没有想清楚的粒度问题。

- 左连接后用 `COUNT(sc.id)` 统计成绩数，`COUNT(*)` 会计入未匹配时保留的一行。
- 忘记连接条件可能产生大量组合，先检查关联键和键的唯一性。
- 存在一条 score 为空的成绩，与完全没有成绩记录不是同一件事。

## SQL 示例

```sql
SELECT s.name AS 姓名, c.name AS 课程, sc.score AS 成绩
FROM students s
LEFT JOIN scores sc ON sc.student_id = s.id
LEFT JOIN courses c ON c.id = sc.course_id
ORDER BY s.id, c.id;
```

## 结果解读

默认数据返回 27 行：26 条成绩和江一没有成绩时保留的一行。程墨有一条成绩记录但分数为空，可以与江一对照理解。

## 巩固练习

改为 INNER JOIN 比较江一是否还在；恢复 LEFT JOIN，把 `sc.score >= 90` 分别放在 ON 与 WHERE 中观察差异。

## 学习提醒

连接是一对多时，左表一行会对应多行结果。不要误把连接产生的多行当成重复错误。
