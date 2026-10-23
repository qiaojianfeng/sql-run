import { Prec, Transaction, type EditorState, type TransactionSpec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

export function getSqlToRun(state: EditorState) {
  const selection = state.selection.main;
  return selection.empty
    ? state.doc.toString()
    : state.sliceDoc(selection.from, selection.to);
}

export function sqlLoadTransaction(state: EditorState, sql: string, mode: 'insert' | 'replace'): TransactionSpec {
  const from = mode === 'replace' ? 0 : state.selection.main.head;
  const to = mode === 'replace' ? state.doc.length : from;
  return {
    changes: { from, to, insert: sql },
    selection: { anchor: from + sql.length },
    scrollIntoView: true,
    userEvent: 'load.sql',
    annotations: Transaction.addToHistory.of(true),
  };
}

export function sqlRunKeymap(onRun: () => void) {
  return Prec.highest(keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => { onRun(); return true; },
      preventDefault: true,
    },
    {
      key: 'Meta-Enter',
      run: () => { onRun(); return true; },
      preventDefault: true,
    },
  ]));
}
