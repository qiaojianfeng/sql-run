---
id: "cte"
order: 9
category: "进阶查询"
summary: "用 WITH 命名中间结果，用排名函数保留行级明细。"
---

# CTE 与窗口函数：整理复杂查询

## 学习目标

- 用命名步骤组织查询
- 保留明细并计算排名
- 根据并列规则选择排名函数

## 命名中间结果

`WITH` 定义只在当前语句中可用的公共表表达式（CTE），可以将复杂查询拆成易读的步骤。它不是永久表，也不意味着一定会产生物化临时表。MySQL 8.0 及以上支持 CTE。

## 窗口内排名

窗口函数不会像 `GROUP BY` 一样把多行压缩为一行。`PARTITION BY` 指定分区，窗口内 `ORDER BY` 指定排名顺序。`ROW_NUMBER` 每行一个序号，`RANK` 同分同名次且留间隔，`DENSE_RANK` 同分同名次但不留间隔。

## 三种排名的并列规则

假设成绩依次为 95、95、90、80。先明确是否允许并列、并列后是否跳过名次，再选择函数。窗口中的排序决定计算规则，最外层排序决定展示顺序。

| 窗口函数 | 排名示例 | 处理规则 |
| --- | --- | --- |
| `ROW_NUMBER()` | 1、2、3、4 | 每行独立序号；需明确并列时的次级顺序 |
| `RANK()` | 1、1、3、4 | 同分并列，后续名次留间隔 |
| `DENSE_RANK()` | 1、1、2、3 | 同分并列，后续名次连续 |

## 筛选排名时再包一层

不能在同一查询层的 WHERE 中直接筛选刚计算出的窗口排名。可以先用 CTE 计算名次，再在外层写 `WHERE 名次 <= 3`。多个 CTE 用逗号分隔，后面的步骤可以引用前面的结果。

RANK 的前三名可能超过三行。如果需求是“每门课恰好取三条”，使用带明确并列顺序的 ROW_NUMBER 更合适。CTE 的命名应表达业务含义，例如有效成绩、课程排名，而非 temp1、temp2。

- CTE 只在当前语句内有效，不是永久表。
- 窗口函数保留明细，GROUP BY 则通常将多行折叠为统计行。
- 命名步骤改善可读性，不代表必然物化，也不保证查询更快。

## SQL 示例

```sql
WITH valid_scores AS (
  SELECT student_id, course_id, score
  FROM scores WHERE score IS NOT NULL
)
SELECT student_id, course_id, score,
  RANK() OVER (PARTITION BY course_id ORDER BY score DESC) AS 名次
FROM valid_scores
ORDER BY course_id, 名次, student_id;
```

## 结果解读

第一门课程中两条 95 分并列第一，下一名从第三开始；课程变化后排名从头计算。分数为 NULL 的记录已在 CTE 中排除。

## 巩固练习

增加第二个 CTE 保存排名，在外层只显示每门课程前三名，再替换 DENSE_RANK 比较差异。

## 学习提醒

MySQL 8.0 及以上支持窗口函数。RANK 的排序条件中加入唯一 id 会打破同分并列，需要与最终结果排序区分。
