---
id: "transaction"
order: 11
category: "数据与结构"
summary: "理解 BEGIN、COMMIT 与 ROLLBACK 的作用。"
---

# 事务：让一组修改共同完成

## 学习目标

- 掌握事务边界
- 理解 ACID
- 认识本地实验与 MySQL 并发的区别

## 提交或撤销

事务将一组操作作为一个工作单元。`BEGIN` 开启，`COMMIT` 提交，`ROLLBACK` 撤销尚未提交的修改。MySQL 通常也可以使用 `START TRANSACTION`。提交之后再执行 ROLLBACK 不能撤回已经提交的数据。

## ACID 与实验边界

ACID 分别指原子性、一致性、隔离性和持久性。事务行为取决于数据库和存储引擎。这里使用单连接 SQLite，不能用于验证 MySQL InnoDB 的隔离级别、行锁、死锁或并发可见性。

## 用 ACID 理解事务承诺

事务把多条操作组织成一个工作单元，但不会自动证明业务逻辑正确。以创建订单并扣减库存为例，还需要检查库存充足、更新命中目标，以及失败时应用是否执行了回滚。

| 特性 | 含义 | 学习关注点 |
| --- | --- | --- |
| 原子性 Atomicity | 作为整体提交或撤销 | 失败后有没有结束事务 |
| 一致性 Consistency | 结合约束和业务逻辑维持有效数据 | 事务不代替规则设计 |
| 隔离性 Isolation | 控制并发事务相互影响 | 不同隔离级别行为不同 |
| 持久性 Durability | 通过持久化机制保存已提交数据 | 浏览器本地存储仍可能被清理 |

## 提交与回滚不能互相替代

事务内修改对当前连接可见，因此可以先 SELECT 检查，再决定提交或撤销。COMMIT 完成之后，ROLLBACK 不能撤销上一笔已提交事务；恢复需要新的修正操作或备份。

这里使用单连接 SQLite，不能验证 InnoDB 的行锁、死锁或多会话可见性。单条语句报错也不等于整段事务已经结束，重试前应先处理未完成事务，避免重复 BEGIN。

## SQL 示例

```sql
BEGIN;
UPDATE students SET age = age + 1 WHERE id = 1;
SELECT name, age FROM students WHERE id = 1;
ROLLBACK;
SELECT name, age FROM students WHERE id = 1;
```

## 结果解读

默认数据中，事务内林晓年龄变成 21，回滚后恢复为 20。当前连接能看到未提交状态，但这些修改还没有成为已提交数据。

## 巩固练习

先记录原年龄，将 ROLLBACK 改成 COMMIT 后运行，确认变化；再练习用一次新的 UPDATE 恢复原值。

## 学习提醒

MySQL 的许多 DDL 会隐式提交，不能将本地 SQLite 的 DDL 回滚结果套用到 MySQL。刷新、停止或超时恢复使用最近已保存的提交快照，当前运行和未提交修改不会保留。
