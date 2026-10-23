import { AlertCircle, Check, Clock3, Copy, Download, Table2, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Execution } from '../database/types';
import { downloadFile } from '../utils/download';
import { cellText, resultText } from '../utils/resultExport';

interface Props {
  execution: Execution | null;
  status: string;
  onLocateError: () => void;
  canLocateError: boolean;
}

export function Results({ execution, status, onLocateError, canLocateError }: Props) {
  const [active, setActive] = useState(0);
  const [copyNotice, setCopyNotice] = useState('');
  useEffect(() => { setActive(0); setCopyNotice(''); }, [execution]);
  const result = execution?.results[active];

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(`${label}已复制`);
    } catch {
      setCopyNotice('复制失败，请选中内容手动复制，或通过 CSV 导出。');
    }
  }

  return (
    <section className="results-panel" aria-label="执行结果" aria-busy={status === 'running'}>
      <div className="panel-heading result-heading">
        <span><Table2 size={16} /> 查询结果</span>
        {execution && (
          <div className="execution-meta">
            <span className={execution.error ? 'text-error' : 'text-success'}>
              {execution.error ? <AlertCircle size={13} /> : <Check size={13} />}
              {execution.error ? '执行遇到错误' : '执行成功'}
            </span>
            <span><Clock3 size={13} /> {execution.duration.toFixed(1)} ms</span>
          </div>
        )}
      </div>
      {execution?.error && (
        <div className="sql-error" role="alert">
          <AlertCircle size={17} />
            <div>
              <strong>{execution.failedStatement ? `第 ${execution.failedStatement.index} 条语句执行失败` : '请检查 SQL 语句'}</strong>
              <code>{execution.error}</code>
              {execution.failedStatement && <pre className="failed-sql">{execution.failedStatement.sql}</pre>}
              {execution.failedStatement && !execution.failedStatement.exact && <small>语句解析失败，以上从失败位置展示，可能包含后续未执行语句。</small>}
              {execution.failedStatement && (
                <button className="text-button" disabled={!canLocateError} onClick={onLocateError}>
                  {canLocateError ? '定位到编辑器' : '编辑内容已变化，无法准确定位'}
                </button>
              )}
            <small>错误后的语句未执行；前面的修改可能已生效。MySQL 专用语法请参考兼容说明。</small>
          </div>
        </div>
      )}
      {execution && execution.results.length > 1 && (
        <div className="result-tabs" aria-label="语句结果">
          {execution.results.map((item, index) => (
            <button
              key={index}
              className={active === index ? 'active' : ''}
              onClick={() => setActive(index)}
              title={item.sql}
            >
              结果 {index + 1}{item.columns.length > 0 ? ` · ${item.values.length} 行` : ''}
            </button>
          ))}
        </div>
      )}
      {result ? (
        result.columns.length > 0 ? (
          <>
            <div className="result-actions">
              <span>{result.truncated ? '部分结果 · 已截断' : result.values.length === 0 ? '查询无数据' : '完整结果'}</span>
              <button className="text-button" onClick={() => void copy(resultText(result, 'tsv'), '整表')}>
                <Copy size={14} /> 复制整表
              </button>
              <button
                className="text-button"
                onClick={() => downloadFile(`\uFEFF${resultText(result, 'csv')}`, `sql-run-result-${active + 1}.csv`, 'text/csv;charset=utf-8')}
              >
                <Download size={14} /> 导出 CSV
              </button>
            </div>
            <p className="result-copy-notice" role="status">{copyNotice || '点击单元格右侧按钮复制；复制与导出仅包含当前已展示的数据。'}</p>
            <div className="result-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="row-index">#</th>
                    {result.columns.map((column, index) => <th key={index}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.values.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="row-index">{rowIndex + 1}</td>
                      {row.map((cell, index) => (
                        <td key={index}>
                          {cell === null ? <span className="null-value">NULL</span> : String(cell)}
                          <button className="cell-copy" aria-label={`复制第 ${rowIndex + 1} 行 ${result.columns[index]} 单元格`} onClick={() => void copy(cellText(cell), '单元格')}>
                            <Copy size={12} />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.values.length === 0 && (
                <div className="empty-rows">{result.truncated ? '累计结果已达返回上限，当前语句的数据未展示。请单独运行这条查询。' : '查询成功，没有符合条件的数据。'}</div>
              )}
            </div>
            <div className="result-footer">
              <span>{result.truncated ? `已展示 ${result.values.length} 行 · 结果已截断` : `共 ${result.values.length} 行`}</span>
              <span>最多展示 500 行</span>
            </div>
          </>
        ) : (
          <div className="statement-success">
            <Check size={25} />
            <strong>语句执行成功</strong>
            <span>
              {result.affectedRows === null
                ? '操作已完成，可以继续查询验证。'
                : `影响 ${result.affectedRows} 行数据`}
            </span>
            <code>{result.sql}</code>
          </div>
        )
      ) : (
        !execution?.error && (
          <div className="result-empty">
            <div className={`empty-icon ${status === 'running' ? 'pulse' : ''}`}>
              <Terminal size={27} />
            </div>
            <strong>{status === 'running' ? 'SQL 正在运行…' : '每一次查询，都是一次发现'}</strong>
            <span>
              {status === 'running'
                ? '查询最多运行 5 秒，你也可以随时停止。'
                : '点击「运行 SQL」，在这里查看你的查询结果。'}
            </span>
            {status !== 'running' && <kbd>Ctrl / ⌘ + Enter</kbd>}
          </div>
        )
      )}
    </section>
  );
}
