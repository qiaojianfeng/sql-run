---
id: "schema"
order: 12
category: "数据与结构"
summary: "认识主键、外键、唯一约束与索引的用途。"
---

# 建表、约束与索引

## 学习目标

- 用约束表达数据规则
- 为实际查询设计索引
- 识别建表与执行计划的方言差异

## 用约束表达规则

`PRIMARY KEY` 唯一标识记录，`NOT NULL` 禁止空值，`UNIQUE` 防止重复，`FOREIGN KEY` 表达引用关系，`CHECK` 校验条件。SQLite 的类型系统比 MySQL 宽松，`VARCHAR(n)` 不会像 MySQL 那样限制长度。

## 索引不是越多越好

索引可以帮助定位记录，但占用存储并增加写入成本。联合索引的字段顺序与查询条件有关，是否使用索引由优化器决定。真实 MySQL 可用 `EXPLAIN` 分析计划，本地 SQLite 应使用 `EXPLAIN QUERY PLAN`，两者字段和含义不同。

## 约束各自保护什么

建表前先确定每行的业务含义、唯一标识和字段是否必填。下面的笔记表每行是一篇笔记，student_id 表示作者。约束帮助拒绝无效数据，但不同约束的职责不能互相替代。

| 约束 | 职责 | 注意事项 |
| --- | --- | --- |
| `PRIMARY KEY` | 唯一标识记录 | INTEGER PRIMARY KEY 有 SQLite 特有行为 |
| `NOT NULL` | 禁止空值 | 不等于禁止空字符串 |
| `UNIQUE` | 禁止值或组合重复 | 需要单独理解 NULL 行为 |
| `FOREIGN KEY` | 保证引用有效 | 删除与更新规则需明确设计 |
| `CHECK` | 校验表达式 | 禁止 NULL 通常还要配合 NOT NULL |

## 用查询和执行计划验证索引

笔记常按作者查找，因此示例对 student_id 建索引。你可以运行 `EXPLAIN QUERY PLAN SELECT * FROM study_notes WHERE student_id = 1;` 查看本地计划。是否实际使用索引仍取决于优化器、查询形式和数据规模。

索引占用存储并增加写入维护成本，不应给所有字段都加索引。联合索引的字段顺序需要结合真实筛选、连接和排序需求。小规模练习适合理解结构，不适合据此判断真实 MySQL 的性能。

- 首次查询笔记表为空是正常的：示例只建结构，没有插入笔记。
- `IF NOT EXISTS` 避免重复创建报错，但不会把已有结构自动升级。
- MySQL 用 EXPLAIN，SQLite 用 EXPLAIN QUERY PLAN，输出含义不能直接等同。

## SQL 示例

```sql
CREATE TABLE IF NOT EXISTS study_notes (
  id INTEGER PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  student_id INTEGER REFERENCES students(id)
);
CREATE INDEX IF NOT EXISTS idx_notes_student ON study_notes(student_id);
SELECT * FROM study_notes;
```

## 结果解读

运行后左侧出现 study_notes 表，查询返回空结果。按学生编号建立的索引可用于后续练习；重复执行不会额外创建同名表。

## 巩固练习

插入一篇属于学生 1 的笔记，再按 student_id 查询；尝试使用不存在的学生编号，观察外键如何拒绝写入。

## 学习提醒

这里演示 SQLite 可运行的建表语法。MySQL 自增通常写 BIGINT PRIMARY KEY AUTO_INCREMENT，CREATE INDEX 也不能直接照搬此处的 IF NOT EXISTS 写法。
