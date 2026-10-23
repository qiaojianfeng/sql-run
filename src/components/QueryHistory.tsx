import { Download, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { sameQuery, type HistoryEntry } from '../data/queryHistory';
import { downloadFile } from '../utils/download';

interface Props {
  history: HistoryEntry[];
  favorites: HistoryEntry[];
  onLoad: (sql: string) => void;
  onFavorite: (entry: HistoryEntry) => void;
  onClear: () => void;
  notice: string;
}

const statusLabels = {
  running: '执行中', success: '成功', error: '失败', interrupted: '已中断',
};

export function QueryHistory({ history, favorites, onLoad, onFavorite, onClear, notice }: Props) {
  const [tab, setTab] = useState<'history' | 'favorites'>('history');
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const entries = (tab === 'history' ? history : favorites).filter((entry) =>
    [entry.sql, entry.dataset, entry.error].join(' ').toLocaleLowerCase().includes(query));

  return (
    <>
      <div className="modal-kicker">YOUR SQL NOTEBOOK</div>
      <h2>历史与收藏</h2>
      {notice && <p className="action-notice" role="status">{notice}</p>}
      <p>保留最近 30 次提交与最多 100 条收藏。载入会保护当前草稿，请确认记录所属库与当前实验库一致。</p>
      <div className="query-history-tabs" aria-label="记录分类">
        <button aria-pressed={tab === 'history'} onClick={() => setTab('history')}>执行历史 {history.length}</button>
        <button aria-pressed={tab === 'favorites'} onClick={() => setTab('favorites')}>SQL 收藏 {favorites.length}</button>
      </div>
      <label className="query-history-search">
        <Search size={15} />
        <input
          type="search"
          aria-label="搜索 SQL 记录"
          placeholder="搜索 SQL、实验库或错误…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="query-history-list">
        {entries.map((entry, index) => {
          const favorite = favorites.some((item) => sameQuery(item, entry));
          return (
            <article className="query-history-item" key={entry.id ?? `${entry.time}-${index}`}>
              <div className="query-record-meta">
                <span className={entry.status === 'error' ? 'text-error' : ''}>
                  {entry.status ? statusLabels[entry.status] : tab === 'favorites' ? '收藏 SQL' : '旧记录 · 状态未知'}
                </span>
                <span>{entry.dataset ?? '实验库未记录'}</span>
                {entry.duration !== undefined && <span>{entry.duration.toFixed(1)} ms</span>}
                <time>{entry.time}</time>
              </div>
              <pre>{entry.sql}</pre>
              {entry.error && <p className="query-record-error">{entry.error}</p>}
              <div className="query-record-actions">
                <button className="text-button" onClick={() => onFavorite(entry)} aria-pressed={favorite}>
                  <Star size={14} fill={favorite ? 'currentColor' : 'none'} />{favorite ? '取消收藏' : '收藏'}
                </button>
                <button
                  className="text-button"
                  onClick={() => downloadFile(entry.sql, `sql-run-${entry.id ?? index + 1}.sql`, 'text/plain;charset=utf-8')}
                >
                  <Download size={14} /> 下载 .sql
                </button>
                <button className="secondary-button" onClick={() => onLoad(entry.sql)}>载入编辑器</button>
              </div>
            </article>
          );
        })}
        {entries.length === 0 && (
          <p className="history-empty" role="status">
            {query ? '没有找到匹配的记录。' : tab === 'history' ? '运行第一条 SQL，开始记录。' : '还没有收藏，可收藏编辑器内容或历史 SQL。'}
          </p>
        )}
      </div>
      {tab === 'history' && history.length > 0 && <button className="text-button" onClick={onClear}>清空历史记录（收藏保留）</button>}
    </>
  );
}
