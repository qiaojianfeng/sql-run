---
id: "group"
order: 5
category: "统计与关联"
summary: "使用 COUNT、AVG、SUM、MIN 和 MAX 汇总多行数据。"
---

# GROUP BY 与 HAVING：分组统计

## 学习目标

- 先确定分组粒度
- 区分明细筛选与分组筛选
- 避免含义不明确的输出列

## 从明细到汇总

`GROUP BY` 把相同分组键的记录放在一起。`COUNT` 统计数量，`AVG` 求平均，`SUM` 求和，`MIN` 和 `MAX` 求最小最大值。除 `COUNT(*)` 外，这些常用聚合函数会忽略 `NULL`。

## 区分 WHERE 与 HAVING

`WHERE` 先筛选明细，`HAVING` 再筛选分组后的结果。查询中不参与聚合的字段应放入 `GROUP BY`，避免利用 SQLite 较宽松的规则写出在 MySQL `ONLY_FULL_GROUP_BY` 模式下失败的查询。

## 每一行统计结果代表什么

按 `course_id` 分组后，每行是一门课程；按 `student_id, course_id` 分组后，每行是一个学生在一门课程上的统计。先说清“每个什么，统计什么”，再选择分组键。

`WHERE score >= 60` 先排除不及格成绩，再求剩余成绩平均值；`HAVING AVG(score) >= 60` 先对全组求平均，再保留均分达标的组。两种写法的统计对象不同。

| 表达式 | 回答的问题 | 空值处理 |
| --- | --- | --- |
| `COUNT(*)` | 有多少条记录 | 包含值为空的行 |
| `COUNT(score)` | 有多少条有效成绩 | 忽略 NULL |
| `AVG(score)` / `SUM(score)` | 平均分 / 总分 | 忽略 NULL，无非空输入时返回 NULL |
| `MIN(score)` / `MAX(score)` | 最低分 / 最高分 | 忽略 NULL，无非空输入时返回 NULL |

## 分组不能随便带出一条明细

按课程统计平均分却直接输出 `student_id`，无法明确你想展示哪个学生。应输出分组键，或对其余字段明确聚合，不要依赖 SQLite 对部分分组查询的宽松处理。

若要给分组结果加名称，可以先按稳定编号与名称一起分组，或先统计再关联名称。筛选阈值时优先用原始平均值，最后用 `ROUND` 做展示，避免四舍五入改变临界值的归属。

## SQL 示例

```sql
SELECT course_id, COUNT(score) AS 有效成绩数,
       ROUND(AVG(score), 1) AS 平均分
FROM scores
GROUP BY course_id
HAVING AVG(score) > 80
ORDER BY 平均分 DESC;
```

## 结果解读

每行是一门平均分超过 80 的课程，平均值只计算有效分数。没有任何成绩的课程不会从 scores 表单独产生分组。

## 巩固练习

按班级统计学生人数和平均年龄，再只保留学生人数不少于 6 人的班级。

## 学习提醒

理解顺序可以参考 FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。这是逻辑处理顺序，不是引擎实际执行计划。
