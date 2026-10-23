import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, CircleHelp, Code2, Database, Download, FileText, History, Leaf,
  LoaderCircle, Moon, Play, RotateCcw, Square, Star, Sun, Upload,
} from 'lucide-react';
import { Exercises } from './components/Exercises';
import { Guide } from './components/Guide';
import { ImportDatabase } from './components/ImportDatabase';
import { LearningDocs } from './components/LearningDocs';
import { Modal } from './components/Modal';
import { QueryHistory } from './components/QueryHistory';
import { Results } from './components/Results';
import { Sidebar } from './components/Sidebar';
import { SqlEditor, type SqlEditorHandle } from './components/SqlEditor';
import { INITIAL_SQL, TABLE_DESCRIPTIONS } from './data/dataset';
import { isFavorites, isHistory, sameQuery, type HistoryEntry } from './data/queryHistory';
import { useDatabase } from './hooks/useDatabase';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { downloadFile } from './utils/download';

const isString = (value: unknown): value is string => typeof value === 'string';

const isProgress = (value: unknown): value is number[] => Array.isArray(value)
  && value.every((item) => Number.isInteger(item) && item >= 1 && item <= 20)
  && new Set(value).size === value.length;

export default function App() {
  const database = useDatabase();
  const { theme, toggleTheme, storageError: themeStorageError } = useTheme();
  const [editorValue, setEditorValue, editorStorageError] = useLocalStorage(
    'sql-lab.editor.v1', INITIAL_SQL, isString,
  );
  const [history, setHistory, historyStorageError] = useLocalStorage<HistoryEntry[]>(
    'sql-lab.history.v1', [], isHistory,
  );
  const [favorites, setFavorites, favoritesStorageError] = useLocalStorage<HistoryEntry[]>(
    'sql-run.favorites.v1', [], isFavorites,
  );
  const [completed, setCompleted, progressStorageError] = useLocalStorage<number[]>(
    'sql-lab.progress.v1', [], isProgress,
  );
  const [draftBackup, setDraftBackup, draftStorageError] = useLocalStorage(
    'sql-run.editor.backup.v1', '', isString,
  );
  const [modal, setModal] = useState<'help' | 'history' | 'reset' | 'import' | null>(null);
  const [pendingSql, setPendingSql] = useState<string | null>(null);
  const [learningSql, setLearningSql] = useState<string | null>(null);
  const [page, setPage] = useState<'playground' | 'docs'>('playground');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [lastRun, setLastRun] = useState<{ document: string; from: number; to: number } | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const editorRef = useRef<SqlEditorHandle>(null);
  const table = database.schema.find((item) => item.name === selectedTable);
  const isDefault = database.kind === 'default';
  const canSwitch = database.status === 'ready' && !database.transactionOpen && !database.snapshotError;
  const storageError = editorStorageError || historyStorageError || favoritesStorageError || progressStorageError || themeStorageError || draftStorageError;
  const modalLabel = pendingSql !== null ? '载入 SQL' : learningSql !== null ? '切换默认学习库' : table ? `${table.name} 表结构`
    : modal === 'history' ? '执行历史'
    : modal === 'reset' ? '重置数据'
    : modal === 'import' ? '导入数据表'
    : '使用指南';

  useEffect(() => {
    if (page === 'playground') editorRef.current?.focus();
  }, [page]);

  useEffect(() => {
    setHistory((entries) => entries.map((entry) => entry.status === 'running'
      ? { ...entry, status: 'interrupted', error: '上次页面关闭或刷新，执行结果未记录。' } : entry));
  }, []);

  function runSql() {
    const selection = editorRef.current?.getSelection()
      ?? { sql: editorValue, from: 0, to: editorValue.length, document: editorValue };
    const id = crypto.randomUUID();
    if (database.run(selection.sql, (execution, status) => {
      setHistory((entries) => entries.map((entry) => entry.id === id
        ? { ...entry, status, duration: execution.duration, error: execution.error } : entry));
    })) {
      setLastRun(selection);
      const time = new Date().toLocaleString('zh-CN', { hour12: false });
      setHistory((entries) => [{ id, sql: selection.sql, time, dataset: database.datasetName, status: 'running' as const }, ...entries].slice(0, 30));
    }
  }

  function toggleFavorite(entry: HistoryEntry) {
    const exists = favorites.some((item) => sameQuery(item, entry));
    if (!exists && favorites.length >= 100) {
      setActionNotice('收藏已达 100 条，请先移除不需要的收藏。');
      return;
    }
    setFavorites((entries) => exists ? entries.filter((item) => !sameQuery(item, entry))
      : [{ ...entry, status: entry.status === 'running' ? undefined : entry.status }, ...entries]);
    setActionNotice(exists ? '已取消收藏。' : 'SQL 已收藏，可在「历史与收藏」中查看。');
  }

  function insertField(name: string) {
    setDraftBackup(editorValue);
    setPage('playground');
    editorRef.current?.loadSql(`"${name.replaceAll('"', '""')}"`, 'insert');
  }

  function locateError() {
    const failed = database.execution?.failedStatement;
    if (!failed || !lastRun || lastRun.document !== editorValue) return;
    setPage('playground');
    editorRef.current?.selectRange(lastRun.from + failed.from, Math.min(lastRun.from + failed.to, lastRun.to));
  }

  function loadSql(sql: string) {
    setPendingSql(sql);
    setModal(null);
    setSelectedTable(null);
  }

  function applySql(mode: 'insert' | 'replace') {
    if (pendingSql === null) return;
    setDraftBackup(editorValue);
    setPage('playground');
    editorRef.current?.loadSql(pendingSql, mode);
    setPendingSql(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function practiceSql(sql: string) {
    if (!isDefault) setLearningSql(sql);
    else loadSql(sql);
  }

  function previewTable(name: string) {
    const escapedName = name.replaceAll('"', '""');
    loadSql(`SELECT * FROM "${escapedName}" LIMIT 100;`);
  }

  function closeModal() {
    if (database.status === 'importing') return;
    setModal(null);
    setSelectedTable(null);
    setPendingSql(null);
    setLearningSql(null);
  }

  return (
    <div className="app-shell">
      <Sidebar
        schema={database.schema}
        status={database.status}
        onShowTable={setSelectedTable}
        onPreviewTable={previewTable}
        datasetName={database.datasetName}
        isDefault={isDefault}
        onHome={() => { setPage('playground'); editorRef.current?.focus(); }}
        onInsertField={insertField}
      />
      <main className="main-area">
        <header className="topbar">
          <nav className="topbar-nav" aria-label="工作空间导航">
            <button
              className={page === 'playground' ? 'active' : ''}
              aria-current={page === 'playground' ? 'page' : undefined}
              onClick={() => { setPage('playground'); editorRef.current?.focus(); }}
            >
              <Code2 size={16} /> SQL 实验台
            </button>
            <button
              className={page === 'docs' ? 'active' : ''}
              aria-current={page === 'docs' ? 'page' : undefined}
              onClick={() => setPage('docs')}
            >
              <FileText size={16} /> SQL 学习文档
            </button>
            <button onClick={() => setModal('history')}>
              <History size={16} /> 历史与收藏 <span className="topbar-count">{history.length}</span>
            </button>
            <button disabled={!canSwitch} onClick={() => setModal('import')} title={database.transactionOpen ? '请先提交或回滚当前事务' : '导入自定义实验库'}>
              <Upload size={16} /> 导入数据表
            </button>
          </nav>
          <div className="topbar-actions">
            <button
              className="theme-toggle"
              aria-label="深色模式"
              aria-pressed={theme === 'dark'}
              title={theme === 'dark' ? '切换为浅色模式' : '切换为深色模式'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {theme === 'dark' ? '浅色模式' : '深色模式'}
            </button>
            <button onClick={() => setModal('help')}><CircleHelp size={16} /> 使用指南</button>
          </div>
        </header>
        <div hidden={page !== 'docs'}>
          <LearningDocs onPractice={practiceSql} isDefault={isDefault} />
        </div>
        <div hidden={page !== 'playground'}>
        <div className="workspace-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span /> YOUR PERSONAL SQL PLAYGROUND</div>
              <h1>把想法，写成 SQL<span>。</span></h1>
              <p>一份准备好的数据，一个可以随意探索的空间。开始你的下一次查询吧。</p>
            </div>
            <span className="local-badge"><Leaf size={15} /> 本地实验环境</span>
          </div>
          <div className="dataset-banner">
            <div className="dataset-icon"><Database size={22} /></div>
            <div>
              <strong>{database.datasetName} <span>{isDefault ? '默认学习库' : '自定义实验库'}</span></strong>
              <p>{isDefault
                ? '12 位学生 · 5 门课程 · 26 条成绩，练习查询、关联与统计。'
                : `${database.schema.length} 张自定义数据表 · 自动保存到本地，切换学习库时保留。`}</p>
            </div>
            <div className="dataset-actions">
              {(!isDefault || database.hasCustom) && (
                <button className="secondary-button" disabled={!canSwitch} onClick={() => database.switchDatabase(isDefault ? 'custom' : 'default')}>
                  {isDefault ? '返回自定义库' : '切换学习库'}
                </button>
              )}
              <button className="secondary-button" disabled={!canSwitch} onClick={database.exportDatabase}>
                <Download size={14} /> 导出备份
              </button>
            </div>
          </div>
          {(database.notice || storageError || database.storageError || database.snapshotError || database.transactionOpen) && (
            <div className="notice" role="status">
              {database.notice}
              {database.storageError && ` ${database.storageError}`}
              {database.snapshotError && ` ${database.snapshotError}`}
              {database.transactionOpen && ' 当前事务尚未结束，请执行 COMMIT 或 ROLLBACK；刷新只恢复上次提交快照，暂不可切换或导出。'}
              {storageError && ' 浏览器本地存储不可用，本次内容仍可使用，但可能无法保存。'}
              {database.status === 'error' && <button className="text-button" onClick={database.retry}>重试恢复</button>}
            </div>
          )}
          <div className="workbench">
            <div className="query-workspace">
              <section className="editor-panel" aria-label="SQL 编辑区域">
                <div className="editor-toolbar">
                  <span className="editor-tab"><Code2 size={15} /> playground.sql <span /></span>
                  <span className="engine-label">SQLite <span>WASM</span></span>
                </div>
                <SqlEditor
                  ref={editorRef}
                  value={editorValue}
                  onChange={setEditorValue}
                  onRun={runSql}
                  onSelectionChange={(selected) => {
                    setHasSelection(selected);
                    setSelectionVersion((version) => version + 1);
                  }}
                  schema={database.schema}
                />
                <div className="editor-actions">
                  <div className="editor-draft-actions">
                    <span className="keyboard-tip">选中运行部分语句 <span>·</span> Ctrl / ⌘ + Enter</span>
                    {draftBackup && (
                      <button className="text-button" onClick={() => {
                        const previous = editorValue;
                        editorRef.current?.loadSql(draftBackup, 'replace');
                        setDraftBackup(previous);
                      }}>恢复上份草稿</button>
                    )}
                    <button className="text-button" disabled={!editorValue.trim()} onClick={() => toggleFavorite({
                      id: crypto.randomUUID(), sql: editorRef.current?.getSelectedSql() ?? editorValue,
                      time: new Date().toLocaleString('zh-CN', { hour12: false }), dataset: database.datasetName,
                    })}><Star size={14} /> 收藏 SQL</button>
                    <button className="text-button" disabled={!editorValue.trim()} onClick={() => downloadFile(editorRef.current?.getSelectedSql() ?? editorValue, 'sql-run-draft.sql', 'text/plain;charset=utf-8')}><Download size={14} /> 下载 .sql</button>
                  </div>
                  <div>
                    <button className="text-button reset-button" disabled={database.status === 'importing'} onClick={() => setModal('reset')}>
                      <RotateCcw size={14} /> 重置数据
                    </button>
                    {database.status === 'running' ? (
                      <button
                        className="run-button stop-button"
                        onClick={database.stop}
                      >
                        <Square size={13} /> 停止运行
                      </button>
                    ) : (
                      <button
                        className="run-button"
                        disabled={database.status !== 'ready' || !editorValue.trim()}
                        onClick={runSql}
                      >
                        {database.status === 'loading'
                          ? <LoaderCircle size={15} className="spin" />
                          : <Play size={14} fill="currentColor" />}
                        {database.status === 'loading' ? '准备中' : hasSelection ? '运行选中内容' : '运行 SQL'}
                      </button>
                    )}
                  </div>
                </div>
              </section>
              {actionNotice && <p className="action-notice" role="status">{actionNotice}</p>}
              <Results execution={database.execution} status={database.status} onLocateError={locateError} canLocateError={Boolean(lastRun && lastRun.document === editorValue)} />
              <div className="compatibility-note">
                <CircleHelp size={14} />
                <span>支持通用 SQL 学习，MySQL 专用语法可能有差异。</span>
                <button onClick={() => setModal('help')}>兼容说明 <ArrowRight size={12} /></button>
              </div>
            </div>
            {isDefault ? (
              <Exercises
                completed={completed}
                onComplete={(id) => setCompleted(completed.includes(id)
                  ? completed.filter((item) => item !== id)
                  : [...completed, id])}
                onLoad={practiceSql}
                getSql={() => editorRef.current?.getSelectedSql() ?? editorValue}
                editorValue={editorValue}
                selectionVersion={selectionVersion}
              />
            ) : (
              <aside className="exercise-panel learning-library-gate">
                <div className="topic-tag">需要默认学习库</div>
                <h2>准备开始练习？</h2>
                <p>内置练习使用 students、courses 和 scores 表。切换到默认学习库即可练习，自定义表和数据会保留。</p>
                <button className="secondary-button" disabled={!canSwitch} onClick={() => database.switchDatabase('default')}>切换默认学习库 <ArrowRight size={14} /></button>
              </aside>
            )}
          </div>
          <footer className="page-footer">
            <span>SQL-RUN <span> / </span> 保持好奇，慢慢进步。</span>
            <span>
              <span className={`status-dot ${database.status}`} />
              {database.status === 'ready' ? '实验引擎已就绪'
                : database.status === 'running' ? '正在执行查询'
                : database.status === 'loading' ? '正在初始化引擎'
                : database.status === 'importing' ? '正在导入数据表'
                : '引擎需要重置'}
            </span>
          </footer>
        </div>
        </div>
      </main>
      {(modal || table || pendingSql !== null || learningSql !== null) && (
        <Modal label={modalLabel} onClose={closeModal}>
          {pendingSql !== null ? (
            <>
              <div className="modal-kicker">KEEP YOUR IDEAS</div>
              <h2>如何载入这段 SQL？</h2>
              <p>插入会保留原内容；替换前自动保存一份草稿。两种操作均支持在编辑器内按 Ctrl / ⌘ + Z 撤销。</p>
              <pre className="schema-sql sql-load-preview">{pendingSql}</pre>
              <div className="modal-actions sql-load-actions">
                <button className="text-button" onClick={closeModal}>取消</button>
                <button className="secondary-button" onClick={() => applySql('replace')}>备份并替换内容</button>
                <button className="run-button" onClick={() => applySql('insert')}>插入光标处</button>
              </div>
            </>
          ) : learningSql !== null ? (
            <>
              <div className="modal-kicker">LEARNING DATABASE</div>
              <h2>这个示例需要默认学习库</h2>
              <p>切换后再选择如何载入 SQL。当前自定义实验库会保留，可随时切换回来。</p>
              {database.transactionOpen && <p>请先返回实验台 COMMIT 或 ROLLBACK 当前事务。</p>}
              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal}>继续使用自定义库</button>
                <button className="run-button" disabled={!canSwitch} onClick={() => {
                  database.switchDatabase('default');
                  loadSql(learningSql);
                  setLearningSql(null);
                }}>切换并载入示例</button>
              </div>
            </>
          ) : table ? (
            <>
              <div className="modal-kicker">DATABASE SCHEMA</div>
              <h2>{table.name}</h2>
              <p>{(isDefault && TABLE_DESCRIPTIONS[table.name]) || '自建数据表'} · {table.columns.length} 个字段</p>
              <pre className="schema-sql">{table.sql};</pre>
              <p>金色钥匙表示主键。字段类型按 SQLite 引擎展示。</p>
              <button className="run-button" onClick={() => { closeModal(); previewTable(table.name); }}>
                载入查询 <ArrowRight size={14} />
              </button>
            </>
          ) : modal === 'reset' ? (
            <>
              <div className="modal-kicker">FRESH START</div>
              <h2>让实验数据回到起点？</h2>
              <p>默认学习库将恢复初始学生成绩数据，之前对学习库的修改会被清除；自定义实验库及其数据、编辑内容、执行历史和学习进度保留。当前未提交事务会丢弃。</p>
              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal}>继续实验</button>
                <button
                  className="run-button"
                  onClick={() => { database.reset(); closeModal(); }}
                >
                  <RotateCcw size={14} /> 确认重置
                </button>
              </div>
            </>
          ) : modal === 'history' ? (
            <QueryHistory history={history} favorites={favorites} onLoad={loadSql} onFavorite={toggleFavorite} onClear={() => setHistory([])} notice={actionNotice} />
          ) : modal === 'import' ? (
            <ImportDatabase
              importing={database.status === 'importing'}
              onImport={database.importDatabase}
              onSuccess={() => { setModal(null); setPage('playground'); }}
            />
          ) : <Guide onClose={closeModal} />}
        </Modal>
      )}
    </div>
  );
}
