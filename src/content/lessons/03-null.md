---
id: "null"
order: 3
category: "查询基础"
summary: "区分未知值、空字符串和零，理解去重的作用范围。"
---

# NULL 与 DISTINCT：空值和去重

## 学习目标

- 区分未知值、空文本和零
- 理解整组输出的去重
- 核对统计的分母

## 空值需要专门判断

`NULL` 表示缺失或未知，不等于数字 `0`，也不等于空字符串。使用 `IS NULL` 或 `IS NOT NULL` 判断；`= NULL` 和 `<> NULL` 不会得到通常预期的筛选结果。

## 去重与默认值

`DISTINCT` 对选择的所有列组合去重，而不是只针对第一列。`COALESCE(city, '未知')` 返回第一个非 NULL 值，适合展示默认文字。`COUNT(*)` 包含所有行，`COUNT(city)` 只计算非空城市。

## 为什么比较 NULL 得不到预期结果

可以把 `NULL` 理解为“暂时不知道”。不知道的城市既不能确认等于杭州，也不能确认不等于杭州。普通比较得到的“未知”无法通过 `WHERE`，因此应使用专门的空值判断。

展示时可用 `COALESCE(city, '未填写')`，它不修改原值。成绩缺失也不等于零分：`AVG(score)` 忽略空值，而 `AVG(COALESCE(score, 0))` 将缺失项作为零纳入计算，回答的是不同问题。

## 用三种计数检查数据口径

`DISTINCT` 对选出的全部列组合去重。只选择城市时得到不重复城市；同时选择班级和城市时，同一个城市可以因为班级不同而出现多行。去重也不负责排序，需要有序结果仍应写 `ORDER BY`。

| 表达式 | 统计含义 | 默认学生库 |
| --- | --- | --- |
| `COUNT(*)` | 所有学生行 | 12 |
| `COUNT(city)` | 城市非空的行 | 10 |
| `COUNT(DISTINCT city)` | 不同的非空城市 | 5 |

## SQL 示例

```sql
SELECT name, COALESCE(city, '未知') AS 城市
FROM students
WHERE city IS NULL;

SELECT DISTINCT city FROM students WHERE city IS NOT NULL;
```

## 结果解读

第一组结果是城市未填写的苏然和江一，第二组为五个不同的非空城市。默认文字只影响显示，原始值仍然是 NULL。

## 巩固练习

对 `scores` 分别运行 `COUNT(*)` 与 `COUNT(score)`，再用 `IS NULL` 找出导致数量不同的成绩记录。

## 学习提醒

NULL 参与普通比较时结果通常也是未知；在 WHERE 中只有条件为真的行才会被保留。
