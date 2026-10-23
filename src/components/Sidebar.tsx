import {
  ArrowRight, Braces, ChevronDown, ChevronRight,
  Database, KeyRound, Search, ShieldCheck, Table2, Terminal,
} from 'lucide-react';
import { useState } from 'react';
import { FIELD_COMMENTS, TABLE_DESCRIPTIONS } from '../data/dataset';
import type { TableSchema } from '../database/types';

interface Props {
  schema: TableSchema[];
  status: string;
  onShowTable: (name: string) => void;
  onPreviewTable: (name: string) => void;
  datasetName: string;
  isDefault: boolean;
  onHome: () => void;
  onInsertField: (name: string) => void;
}

export function Sidebar({
  schema, status, onShowTable, onPreviewTable, datasetName, isDefault, onHome, onInsertField,
}: Props) {
  const [expanded, setExpanded] = useState<string[]>(['students']);
  const [search, setSearch] = useState('');
  const tables = schema.filter((table) => table.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  function toggleTable(name: string) {
    setExpanded((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]);
  }

  return (
    <aside className="sidebar">
      <button className="brand" onClick={onHome} aria-label="返回 SQL 实验台">
        <span className="brand-symbol"><Terminal size={24} /></span>
        <strong>SQL<span>-RUN</span><small>一点点，学会 SQL。</small></strong>
      </button>
      <div className="sidebar-section-label">DATABASE <span>{schema.length} 张表</span></div>
      <div className="database-label">
        <Database size={15} /><strong title={datasetName}>{isDefault ? 'student_lab' : 'custom_lab'}</strong><span>LOCAL</span>
      </div>
      <div className="schema-tools">
        <label className="schema-search">
          <Search size={14} />
          <input
            type="search"
            aria-label="搜索表名"
            placeholder="搜索表名…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button onClick={() => setExpanded([])} disabled={expanded.length === 0}>全部收起</button>
      </div>
      <div className="schema-tree">
        {tables.map((table) => (
          <div key={table.name} className="schema-table">
            <button
              className="table-toggle"
              aria-expanded={expanded.includes(table.name)}
              onClick={() => toggleTable(table.name)}
            >
              {expanded.includes(table.name) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Table2 size={15} />
              <span>{table.name}</span>
              <small>{table.columns.length}</small>
            </button>
            {expanded.includes(table.name) && (
              <div className="schema-columns">
                <div className="table-description">
                  {(isDefault && TABLE_DESCRIPTIONS[table.name]) || '自建数据表'}
                  <button
                    onClick={() => onShowTable(table.name)}
                    title="查看表结构"
                    aria-label={`查看 ${table.name} 表结构`}
                  >
                    <Braces size={12} />
                  </button>
                </div>
                {table.columns.map((column) => (
                  <div className="schema-column" key={column.name}>
                    {column.primaryKey
                      ? <KeyRound size={11} className="key-icon" />
                      : <span className="column-dot" />}
                    <button className="schema-field-name" title={`插入字段 ${column.name}`} onClick={() => onInsertField(column.name)}>{column.name}</button>
                    <small title={column.type}>{column.type.toLowerCase() || '未指定类型'}</small>
                    {(column.notNull || column.defaultValue !== null && column.defaultValue !== undefined || Boolean(column.references?.length)) && (
                      <span className="schema-field-meta">
                        {column.notNull && <span>NOT NULL</span>}
                        {column.defaultValue !== null && column.defaultValue !== undefined && <span>默认：{column.defaultValue}</span>}
                        {column.references?.map((reference) => <span key={`${reference.table}.${reference.column}`}>外键 → {reference.table}.{reference.column}</span>)}
                      </span>
                    )}
                    {isDefault && FIELD_COMMENTS[table.name]?.[column.name] && (
                      <span className="schema-field-comment">{FIELD_COMMENTS[table.name][column.name]}</span>
                    )}
                  </div>
                ))}
                <button className="preview-table" onClick={() => onPreviewTable(table.name)}>
                  查询示例数据 <ArrowRight size={11} />
                </button>
              </div>
            )}
          </div>
        ))}
        {schema.length === 0 && (
          <p className="schema-empty">
            {status === 'loading' ? '正在准备数据…' : '暂无数据表，可重置恢复。'}
          </p>
        )}
        {schema.length > 0 && tables.length === 0 && <p className="schema-empty" role="status">没有匹配的表，试试其他名称。</p>}
      </div>
      <div className="sidebar-bottom">
        <div className="local-status-heading">
          <span className="local-status-icon"><ShieldCheck size={17} /></span>
          <strong>本地运行</strong>
          <span className="local-status-badge">浏览器内</span>
        </div>
        <p>无需登录 <span aria-hidden="true">·</span> SQL 不上传</p>
      </div>
    </aside>
  );
}
