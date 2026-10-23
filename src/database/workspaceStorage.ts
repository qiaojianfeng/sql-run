import type { DatabaseSnapshot, SavedWorkspace } from './types';

const DATABASE_NAME = 'sql-run-workspace';
const STORE_NAME = 'snapshots';

function openStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('本地数据库被其他标签页占用。'));
  });
}

async function accessWorkspace(mode: IDBTransactionMode, value?: SavedWorkspace) {
  const db = await openStorage();
  try {
    return await new Promise<SavedWorkspace | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = value ? store.put(value, 'workspace') : store.get('workspace');
      transaction.oncomplete = () => resolve(value ?? request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('本地保存已中断。'));
    });
  } finally {
    db.close();
  }
}

export function loadWorkspace() {
  return accessWorkspace('readonly').then((value) => {
    if (value === undefined) return undefined;
    if (!value || (value.active !== 'default' && value.active !== 'custom')
      || !validSnapshot(value.default) || !validSnapshot(value.custom)
      || (value.active === 'custom' && !value.custom)) {
      throw new Error('本地快照格式无效，原数据未修改。');
    }
    return value;
  });
}

function validSnapshot(value: DatabaseSnapshot | undefined) {
  return value === undefined || (value && typeof value.name === 'string'
    && value.data instanceof Uint8Array && value.data.byteLength > 0
    && Number.isFinite(value.savedAt));
}

export async function saveWorkspace(value: SavedWorkspace) {
  await accessWorkspace('readwrite', value);
}
