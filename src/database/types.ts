export type CellValue = string | number | null;

export interface QueryResult {
  sql: string;
  columns: string[];
  values: CellValue[][];
  affectedRows: number | null;
  truncated: boolean;
}

export interface TableSchema {
  name: string;
  sql: string;
  columns: {
    name: string;
    type: string;
    primaryKey: boolean;
    notNull: boolean;
    defaultValue?: string | null;
    references?: { table: string; column: string }[];
  }[];
}

export interface Execution {
  results: QueryResult[];
  error?: string;
  duration: number;
  failedStatement?: { index: number; sql: string; from: number; to: number; exact: boolean };
}

export type DatabaseKind = 'default' | 'custom';

export interface DatabaseSnapshot {
  name: string;
  data: Uint8Array;
  savedAt: number;
}

export interface SavedWorkspace {
  active: DatabaseKind;
  default?: DatabaseSnapshot;
  custom?: DatabaseSnapshot;
}

export type WorkerRequest = { type: 'execute'; sql: string }
  | { type: 'init'; sql?: string; data?: Uint8Array };

export interface WorkerResponse {
  type: 'ready' | 'executed' | 'fatal';
  schema: TableSchema[];
  execution?: Execution;
  error?: string;
  snapshot?: Uint8Array;
  transactionOpen?: boolean;
  snapshotError?: string;
}
