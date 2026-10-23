---
id: "case"
order: 8
category: "进阶查询"
summary: "为成绩分类，处理空值和数值展示。"
---

# CASE 与常用函数：转换查询结果

## 学习目标

- 理解首次命中的 CASE 分支
- 区分计算值与展示值
- 使用条件聚合

## 条件表达式

`CASE` 按顺序判断 `WHEN`，命中第一条为真的条件后返回对应 `THEN` 值。`ELSE` 定义默认结果，没有 ELSE 且没有条件命中时返回 `NULL`。CASE 是表达式，可以放入 SELECT、排序和聚合表达式。

## 常用函数

`ROUND(value, 1)` 四舍五入到一位小数，`COALESCE` 处理空值，`UPPER` 和 `LOWER` 转换字母大小写。日期和字符串函数差异较多：MySQL 使用 `DATE_FORMAT` 等函数，本地 SQLite 的写法不能直接等同。

## 分支顺序决定分类结果

先写 `score >= 60` 再写 `score >= 90`，会让 95 分在第一个分支就命中“及格”。因此先处理特殊的 NULL，再按更具体的高分区间往下判断。

`CASE` 是返回值的表达式，不是独立的流程语句。它可以放在 SELECT、排序或聚合表达式中。返回值尽量保持兼容类型，避免混合数字与文字后引入隐式转换问题。

| 函数 | 用途 | 示例 |
| --- | --- | --- |
| `COALESCE` | 第一个非空值 | `COALESCE(city, '未填写')` |
| `ROUND` | 数值四舍五入 | `ROUND(AVG(score), 1)` |
| `UPPER` / `LOWER` | 转换字母大小写 | `UPPER('sql')` |

## 用 CASE 同时统计多个分类

`SUM(CASE WHEN score >= 60 THEN 1 ELSE 0 END)` 把及格行记为 1，其余记为 0，再求和得到及格数量。配合 `GROUP BY course_id` 就能得到每门课的及格人数。

计算及格率前先确定分母：全部考试记录，还是仅有有效分数的记录？需要小数时用 `100.0` 等明确表达式，避免整数除法截断。`ROUND` 处理的是数值精度，不承诺把结果显示成固定小数位的文本。

## SQL 示例

```sql
SELECT student_id, score,
  CASE
    WHEN score IS NULL THEN '待补考'
    WHEN score >= 90 THEN '优秀'
    WHEN score >= 60 THEN '及格'
    ELSE '未及格'
  END AS 等级
FROM scores;
```

## 结果解读

对照 NULL、58 分、95 分等记录检查分类。调整 WHEN 的先后顺序，再观察 95 分是否仍落在优秀分类，可以验证首次命中的规则。

## 巩固练习

按 course_id 分组，用 SUM(CASE … END) 同时统计优秀、及格（含优秀）和待补考的数量。

## 学习提醒

先判断 NULL，再判断分数范围，可以让分支含义更明确。
