import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DatabaseKind, Execution, SavedWorkspace, TableSchema, WorkerRequest, WorkerResponse,
} from '../database/types';
import { loadWorkspace, saveWorkspace } from '../database/workspaceStorage';

const DEFAULT_NAME = '学生成绩实验库';
type RunCompletion = (execution: Execution, status: 'success' | 'error' | 'interrupted') => void;

export function useDatabase() {
  const workerRef = useRef<Worker | null>(null);
  const importWorkerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const workspaceRef = useRef<SavedWorkspace>({ active: 'default' });
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const canPersist = useRef(true);
  const pendingRun = useRef<{ started: number; onComplete: RunCompletion } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'importing' | 'error'>('loading');
  const [datasetName, setDatasetName] = useState(DEFAULT_NAME);
  const [kind, setKind] = useState<DatabaseKind>('default');
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);
  const [snapshotError, setSnapshotError] = useState('');

  const interruptRun = useCallback((message: string) => {
    const pending = pendingRun.current;
    pendingRun.current = null;
    pending?.onComplete({ results: [], error: message, duration: performance.now() - pending.started }, 'interrupted');
  }, []);

  const persist = useCallback(async () => {
    if (!canPersist.current) return;
    const workspace = { ...workspaceRef.current };
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await saveWorkspace(workspace);
        setStorageError('');
      } catch {
        setStorageError('本地数据库保存失败，当前会话仍可使用；请导出备份，刷新可能丢失修改。');
      }
    });
    await saveQueue.current;
  }, []);

  const remember = useCallback(async (response: WorkerResponse, target: DatabaseKind, name: string) => {
    workspaceRef.current.active = target;
    if (response.snapshot) {
      workspaceRef.current[target] = { name, data: response.snapshot, savedAt: Date.now() };
      await persist();
    }
    setHasCustom(Boolean(workspaceRef.current.custom));
  }, [persist]);

  const initialize = useCallback((target: DatabaseKind, message = '', fresh = false) => {
    interruptRun(message || '执行已中断，实验引擎重新初始化。');
    clearTimeout(timeoutRef.current);
    workerRef.current?.terminate();
    importWorkerRef.current?.terminate();
    setStatus('loading');
    setExecution(null);
    setSchema([]);
    setTransactionOpen(false);
    setNotice(message);
    const snapshot = fresh ? undefined : workspaceRef.current[target];
    const name = snapshot?.name ?? DEFAULT_NAME;
    setDatasetName(name);
    setKind(target);

    let worker: Worker;
    try {
      worker = new Worker(new URL('../database/database.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      setStatus('error');
      setNotice('无法启动实验引擎，请重试。已保存的实验库仍然保留。');
      return;
    }
    workerRef.current = worker;
    worker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
      if (workerRef.current !== worker) return;
      clearTimeout(timeoutRef.current);
      const response = event.data;
      if (response.type === 'fatal') {
        interruptRun(response.error ?? '实验引擎异常');
        setStatus('error');
        setNotice(`数据库异常：${response.error}。可点击重试恢复最近快照。`);
        return;
      }
      if (response.execution && pendingRun.current) {
        const pending = pendingRun.current;
        pendingRun.current = null;
        pending.onComplete(response.execution, response.execution.error ? 'error' : 'success');
      }
      await remember(response, target, name);
      if (workerRef.current !== worker) return;
      setSchema(response.schema);
      setSnapshotError(response.snapshotError ?? '');
      setTransactionOpen(Boolean(response.transactionOpen));
      if (response.execution) setExecution(response.execution);
      setStatus('ready');
    };
    worker.onerror = (event) => {
      if (workerRef.current !== worker) return;
      clearTimeout(timeoutRef.current);
      interruptRun(event.message || '实验引擎异常');
      setStatus('error');
      setNotice(`实验引擎加载失败：${event.message || '请重试。'} 已保存的实验库仍然保留。`);
    };
    worker.postMessage({ type: 'init', data: snapshot?.data } satisfies WorkerRequest);
    timeoutRef.current = setTimeout(() => {
      worker.terminate();
      setStatus('error');
      setNotice('实验引擎加载超时，请重试恢复最近快照。');
    }, 20_000);
  }, [remember, interruptRun]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const saved = await loadWorkspace();
        if (cancelled) return;
        if (saved) workspaceRef.current = saved;
      } catch {
        if (cancelled) return;
        canPersist.current = false;
        setStorageError('无法读取本地实验库，已暂停写入以保护原数据；暂用默认库，请导出当前修改并刷新重试。');
      }
      if (!cancelled) initialize(workspaceRef.current.active);
    }
    void start();
    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      workerRef.current?.terminate();
      importWorkerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [initialize]);

  const stop = useCallback(() => {
    initialize(workspaceRef.current.active, '执行已停止，已恢复最近提交快照；本次执行及未提交事务已丢弃。');
  }, [initialize]);

  const run = useCallback((sql: string, onComplete: RunCompletion) => {
    if (status !== 'ready' || pendingRun.current || !sql.trim()) return false;
    pendingRun.current = { started: performance.now(), onComplete };
    setStatus('running');
    setNotice('');
    setExecution(null);
    workerRef.current?.postMessage({ type: 'execute', sql } satisfies WorkerRequest);
    timeoutRef.current = setTimeout(() => {
      initialize(workspaceRef.current.active, '执行超过 5 秒，已恢复最近提交快照；本次执行及未提交事务已丢弃。');
    }, 5000);
    return true;
  }, [initialize, status]);

  const importDatabase = useCallback((source: string | Uint8Array, name: string): Promise<string | null> => {
    if (status !== 'ready') return Promise.resolve('请等待当前操作完成后再导入。');
    if (transactionOpen) return Promise.resolve('请先 COMMIT 或 ROLLBACK 当前事务，再导入。');
    let candidate: Worker;
    try {
      candidate = new Worker(new URL('../database/database.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return Promise.resolve('无法启动导入引擎，原实验数据已保留。');
    }
    setStatus('importing');
    return new Promise((resolve) => {
      importWorkerRef.current = candidate;
      const fail = (message: string) => {
        clearTimeout(timeoutRef.current);
        candidate.terminate();
        importWorkerRef.current = null;
        setStatus('ready');
        resolve(message);
      };
      candidate.onmessage = async (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type !== 'ready' || !event.data.snapshot) {
          fail(event.data.error ?? '导入失败，请检查文件。');
          return;
        }
        clearTimeout(timeoutRef.current);
        await remember(event.data, 'custom', name);
        candidate.terminate();
        importWorkerRef.current = null;
        initialize('custom', `已导入「${name}」。默认学习库已保留，可随时切换。`);
        resolve(null);
      };
      candidate.onerror = () => fail('导入引擎运行失败，原实验数据已保留。');
      timeoutRef.current = setTimeout(() => fail('导入超过 15 秒，已取消；原实验数据已保留。'), 15_000);
      candidate.postMessage(typeof source === 'string'
        ? { type: 'init', sql: source } satisfies WorkerRequest
        : { type: 'init', data: source } satisfies WorkerRequest);
    });
  }, [initialize, remember, status, transactionOpen]);

  function switchDatabase(target: DatabaseKind) {
    if (status !== 'ready' || transactionOpen || (target === 'custom' && !workspaceRef.current.custom)) return;
    initialize(target, target === 'default' ? '已切换到默认学习库，自定义实验库已保留。' : '已恢复自定义实验库。');
  }

  function exportDatabase() {
    const snapshot = workspaceRef.current[workspaceRef.current.active];
    if (!snapshot || transactionOpen || snapshotError || status !== 'ready') return;
    const url = URL.createObjectURL(new Blob([new Uint8Array(snapshot.data)], { type: 'application/vnd.sqlite3' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')}.sqlite`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    status, schema, execution, notice, datasetName, kind, hasCustom, storageError, snapshotError, transactionOpen,
    importDatabase, run, stop, switchDatabase, exportDatabase,
    retry: () => initialize(workspaceRef.current.active),
    reset: () => initialize('default', '默认学习库已重置，自定义实验库仍然保留。', true),
  };
}
