import { Check, Code2, Database, ShieldCheck } from 'lucide-react';

export function Guide({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="modal-kicker">A SMALL GUIDE</div>
      <h2>欢迎来到你的 SQL 实验台</h2>
      <p>左侧查看表结构，中间编写 SQL，右侧按题目练习。所有数据和计算都在当前浏览器完成。</p>
      <div className="guide-section">
        <h3><Database size={16} /> 学生成绩实验库</h3>
        <p>
          <code>students.id → scores.student_id</code><br />
          <code>courses.id → scores.course_id</code>
        </p>
        <p>学生江一没有成绩，人工智能导论没有成绩记录，部分城市和成绩为空，适合练习外连接和 NULL。</p>
      </div>
      <div className="guide-section">
        <h3><Code2 size={16} /> MySQL 兼容范围</h3>
        <p>
          实际执行引擎为 SQLite，支持 SELECT、JOIN、分组、子查询、CTE、窗口函数和基础增删改。
          MySQL 的 DATE_FORMAT、CONCAT、AUTO_INCREMENT、存储过程、用户权限与锁行为不适用；
          类型和 GROUP BY 等规则也有差异。
        </p>
        <p>本工具适合通用 SQL 基础练习，MySQL 专项行为请在真实 MySQL 中验证。</p>
      </div>
      <div className="guide-section">
        <h3><ShieldCheck size={16} /> 随时可以重新开始</h3>
        <p>
          默认学习库与自定义实验库分别保存在本地，刷新恢复最近提交快照；可以切换实验库或导出 SQLite 备份。
          执行最多 5 秒，超时或停止会恢复上次提交快照，本次执行和未提交事务会丢弃。结果最多展示 500 行。
        </p>
        <p>语句依次执行，遇错停止；先前修改不会自动撤销。事务可以跨次执行，未提交期间暂停保存、切换和导出，请记得 COMMIT 或 ROLLBACK。重置仅重建默认学习库，自定义库保留。</p>
        <p>载入示例、答案和历史 SQL 时，可选择插入光标处或备份并替换；支持撤销，也可恢复上份草稿。浏览器存储不可用时会提示，请及时导出。</p>
      </div>
      <div className="guide-section">
        <h3><Check size={16} /> 更顺手地实验</h3>
        <p>左侧支持搜索表名和全部收起；点击字段名会插入编辑器，字段下展示非空、默认值和外键。结果可复制单元格、复制整表或导出 CSV，仅包含已展示的数据。</p>
        <p>选中 SQL 时按钮显示「运行选中内容」。报错会显示失败语句编号和 SQL，编辑内容未变时可定位回编辑器。</p>
        <p>前 18 道查询练习支持独立默认库结果校验，不修改当前实验库；排序题检查行顺序，列别名不限、列顺序需一致。修改和事务题自主验证，进度由你标记。</p>
        <p>「历史与收藏」提供 SQL、实验库和错误搜索，记录执行状态及耗时。可收藏常用 SQL、下载 .sql；清空历史不会删除收藏。</p>
      </div>
      <button className="run-button" onClick={onClose}><Check size={15} /> 开始探索</button>
    </>
  );
}
