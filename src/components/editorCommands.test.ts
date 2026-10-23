import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state';
import { type EditorView, runScopeHandlers } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { describe, expect, it, vi } from 'vitest';
import { getSqlToRun, sqlLoadTransaction, sqlRunKeymap } from './editorCommands';

describe('SQL 运行快捷键', () => {
  for (const modifier of ['ctrlKey', 'metaKey'] as const) {
    for (const selected of [true, false]) {
      it(`${modifier} + Enter 优先于默认换行，执行${selected ? '选中 SQL' : '全部 SQL'}`, () => {
        const sql = 'SELECT 1;\nSELECT 2;';
        const run = vi.fn();
        const dispatch = vi.fn();
        const state = EditorState.create({
          doc: sql,
          selection: selected ? EditorSelection.single(10, sql.length) : EditorSelection.single(0),
          extensions: [basicSetup, sqlRunKeymap(() => run(getSqlToRun(state)))],
        });
        // The keymap dispatcher only needs state; no DOM editor is required.
        const view = { state, dispatch } as unknown as EditorView;
        const event = {
          key: 'Enter', code: 'Enter', keyCode: 13,
          ctrlKey: modifier === 'ctrlKey', metaKey: modifier === 'metaKey',
          shiftKey: false, altKey: false,
        } as KeyboardEvent;

        expect(runScopeHandlers(view, event, 'editor')).toBe(true);
        expect(run).toHaveBeenCalledExactlyOnceWith(selected ? 'SELECT 2;' : sql);
        expect(dispatch).not.toHaveBeenCalled();
        expect(state.doc.toString()).toBe(sql);
      });
    }
  }
});

describe('SQL 载入与草稿撤销', () => {
  for (const mode of ['insert', 'replace'] as const) {
    it(`${mode} 后可单独撤销载入，不会撤销之前的编辑`, () => {
      let state = EditorState.create({ doc: 'SELECT 1;', extensions: [basicSetup] });
      state = state.update({ changes: { from: state.doc.length, insert: '\n-- 我的草稿' }, userEvent: 'input.type' }).state;
      const draft = state.doc.toString();
      state = state.update(sqlLoadTransaction(state, 'SELECT 2;', mode)).state;
      expect(state.doc.toString()).toBe(mode === 'replace' ? 'SELECT 2;' : `SELECT 2;${draft}`);
      const view = {
        get state() { return state; },
        dispatch(spec: TransactionSpec) { state = state.update(spec).state; },
      } as unknown as EditorView;
      expect(runScopeHandlers(view, {
        key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true, metaKey: false,
        shiftKey: false, altKey: false,
      } as KeyboardEvent, 'editor')).toBe(true);
      expect(state.doc.toString()).toBe(draft);
    });
  }

  it('插入光标处时保留选区内原文', () => {
    const state = EditorState.create({ doc: 'SELECT 1;', selection: EditorSelection.single(0, 6) });
    const next = state.update(sqlLoadTransaction(state, '/* example */', 'insert')).state;
    expect(next.doc.toString()).toBe('SELECT/* example */ 1;');
  });
});
