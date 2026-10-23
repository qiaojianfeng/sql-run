---
id: "subquery"
order: 7
category: "统计与关联"
summary: "比较整体平均水平，找出没有匹配记录的数据。"
---

# 子查询与 EXISTS：把查询作为条件

## 学习目标

- 检查标量子查询的形状
- 用 EXISTS 表达关联存在性
- 避免 NOT IN 空值陷阱

## 标量子查询

标量子查询返回一行一列，可用于与单个值比较。例如先计算整体 `AVG(score)`，再选出超过平均分的成绩。用于单值比较的子查询应确保只返回一个值。

## 存在性判断

`EXISTS` 判断子查询是否至少返回一行；`NOT EXISTS` 判断没有任何匹配行。相关子查询通过外层表别名关联当前记录。`NOT IN` 的子查询若包含 `NULL`，可能产生不符合直觉的结果，可优先考虑 `NOT EXISTS`。

## 先单独验证内层查询

“高于整体平均分”可以分两步理解：先求一个平均值，再拿每条成绩与它比较。`SELECT AVG(score) FROM scores` 返回一个值，适合单值比较；直接查询全部 score 不能保证只返回一行。

SQLite 对部分多行标量子查询的处理比 MySQL 宽松，所以本地没报错不代表写法可移植。先核对内层返回的列数、行数和空值，再组合外层查询。

## 存在性判断不需要带回所有明细

`EXISTS` 只判断有没有匹配行，因此常写 `SELECT 1`；数字 1 本身没有特殊业务含义。`sc.course_id = c.id` 引用外层课程编号，构成相关子查询。

`NOT IN (1, NULL)` 不等于“除了 1 全部通过”，因为与未知值的比较会影响判断。表达“找不到任何关联记录”时，NOT EXISTS 通常更清楚，但外层键允许空值时仍应明确业务规则。

- EXISTS 不会因右侧多条匹配记录而把外层行重复多次。
- 改写成 JOIN 时要核对行数是否放大，不能只看字段相同。
- 性能应结合真实数据与执行计划判断，子查询不一定比 JOIN 慢。

## SQL 示例

```sql
SELECT * FROM scores
WHERE score > (SELECT AVG(score) FROM scores);

SELECT c.name
FROM courses c
WHERE NOT EXISTS (
  SELECT 1 FROM scores sc WHERE sc.course_id = c.id
);
```

## 结果解读

第一组返回高于整体有效平均分的成绩明细，第二组返回没有任何成绩记录的“人工智能导论”。

## 巩固练习

使用 NOT EXISTS 查找没有成绩记录的学生，并说明它与“成绩记录中的 score 为 NULL”有什么不同。

## 学习提醒

子查询不一定比 JOIN 慢，应结合实际数据和真实 MySQL 执行计划判断。
