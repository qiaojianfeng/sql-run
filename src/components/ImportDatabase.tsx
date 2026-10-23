import { FileCode2, LoaderCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { MAX_IMPORT_BYTES } from '../database/importSql';

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

interface Props {
  importing: boolean;
  onImport: (sql: string | Uint8Array, name: string) => Promise<string | null>;
  onSuccess: () => void;
}

export function ImportDatabase({ importing, onImport, onSuccess }: Props) {
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [binary, setBinary] = useState<Uint8Array | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = importing || reading;

  async function readFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!/\.(sql|sqlite|db)$/i.test(file.name)) {
      setError('请选择 .sql、.sqlite 或 .db 文件。');
      return;
    }
    const isBackup = /\.(sqlite|db)$/i.test(file.name);
    if (file.size > (isBackup ? MAX_BACKUP_BYTES : MAX_IMPORT_BYTES)) {
      setError(isBackup ? '数据库备份超过 20 MB，请精简后重试。' : 'SQL 文件超过 2 MB，请精简后重试。');
      return;
    }
    setReading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isBackup) {
        if (new TextDecoder().decode(bytes.subarray(0, 16)) !== 'SQLite format 3\0') {
          throw new Error('不是有效的 SQLite 数据库文件。');
        }
        setBinary(bytes);
        setSource('');
      } else {
        const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        setSource(content);
        setBinary(null);
      }
      setFileName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? `文件读取失败：${cause.message}（SQL 文本需 UTF-8 编码）` : '文件读取失败。');
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    setError('');
    try {
      const result = await onImport(binary ?? source, fileName || '自定义实验库');
      if (result) setError(result);
      else onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法启动导入，请重试。');
    }
  }

  return (
    <>
      <div className="modal-kicker">YOUR OWN SQL PLAYGROUND</div>
      <h2>导入自己的数据表</h2>
      <p>选择 SQL 文件，或粘贴建表与初始化语句，在本地开始实验。文件仅在浏览器内处理。</p>
      <input
        ref={fileRef}
        type="file"
        accept=".sql,.sqlite,.db"
        hidden
        disabled={busy}
        onChange={(event) => {
          void readFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <button className="import-file-button" disabled={busy} onClick={() => fileRef.current?.click()}>
        <FileCode2 size={24} />
        <strong>{reading ? '正在读取…' : fileName || '选择 SQL 或 SQLite 备份'}</strong>
        <span>SQL 最大 2 MB / 2,000 条语句 · SQLite 备份最大 20 MB</span>
      </button>
      {binary && <p role="status">SQLite 备份已就绪，导入前会校验文件。输入 SQL 可改用文本导入。</p>}
      <label className="import-source-label" htmlFor="import-source">SQL 预览与编辑</label>
      <textarea
        id="import-source"
        className="import-source"
        value={source}
        disabled={busy}
        spellCheck={false}
        placeholder={'CREATE TABLE my_table (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL\n);\nINSERT INTO my_table VALUES (1, \'Hello SQL\');'}
        onChange={(event) => { setSource(event.target.value); setBinary(null); setFileName(''); setError(''); }}
      />
      <div className="import-explanation">
        <strong>导入为独立实验库</strong>
        <p>成功后替换自定义实验库，默认学习库保留；失败或超时保留原环境。实验库自动保存在浏览器，刷新可恢复，也可导出 SQLite 备份。已有自定义库时请先导出备份。</p>
        <p>支持 SQLite 兼容的 CREATE TABLE、INSERT 等语句。MySQL dump 中的 ENGINE、CHARSET、AUTO_INCREMENT、SET、USE 等语法需先调整，不会自动转换。</p>
      </div>
      {error && <p className="import-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="run-button" disabled={busy || (!binary && !source.trim())} onClick={() => void submit()}>
          {importing ? <LoaderCircle size={15} className="spin" /> : <Upload size={15} />}
          {importing ? '正在导入…' : '导入并替换自定义库'}
        </button>
      </div>
    </>
  );
}
