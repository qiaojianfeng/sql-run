import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { TableSchema } from '../database/types';
import { getSqlToRun, sqlLoadTransaction, sqlRunKeymap } from './editorCommands';

export interface SqlEditorHandle {
  getSelectedSql: () => string;
  focus: () => void;
  loadSql: (sql: string, mode: 'insert' | 'replace') => void;
  getSelection: () => { sql: string; from: number; to: number; document: string };
  selectRange: (from: number, to: number) => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  schema: TableSchema[];
  onSelectionChange: (selected: boolean) => void;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px', backgroundColor: 'var(--surface)', color: 'var(--text)' },
  '.cm-scroller': { fontFamily: "'Cascadia Code', 'SFMono-Regular', Consolas, monospace", lineHeight: '1.9' },
  '.cm-content': { padding: '20px 0' },
  '.cm-gutters': { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: 'none', paddingRight: '14px' },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
    boxShadow: 'inset 2px 0 var(--accent-border)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--accent-text)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent-text)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--selection)',
  },
  '.cm-selectionMatch': { backgroundColor: 'var(--accent-soft)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)',
  },
  '.cm-panels': {
    backgroundColor: 'var(--surface-muted)', color: 'var(--text)',
  },
  '.cm-searchMatch': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent-border)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--selection)' },
  '.cm-focused': { outline: 'none' },
  '&.cm-focused': { outline: 'none' },
});

const sqlHighlighting = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--syntax-number)' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.operator, tags.typeName], color: 'var(--accent-text)' },
]);

export const SqlEditor = forwardRef<SqlEditorHandle, Props>(function SqlEditor(
  { value, onChange, onRun, schema, onSelectionChange }, ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun, onSelectionChange });
  callbacks.current = { onChange, onRun, onSelectionChange };
  const language = useRef(new Compartment());

  useImperativeHandle(ref, () => ({
    getSelectedSql() {
      const state = viewRef.current?.state;
      if (!state) return value;
      return getSqlToRun(state);
    },
    focus() { viewRef.current?.focus(); },
    getSelection() {
      const state = viewRef.current?.state;
      const selected = state?.selection.main;
      const document = state?.doc.toString() ?? value;
      return {
        sql: state ? getSqlToRun(state) : value,
        from: selected && !selected.empty ? selected.from : 0,
        to: selected && !selected.empty ? selected.to : document.length,
        document,
      };
    },
    selectRange(from, to) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
      view.focus();
    },
    loadSql(sql, mode) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch(sqlLoadTransaction(view.state, sql, mode));
      view.focus();
    },
  }), [value]);

  useEffect(() => {
    if (!container.current) return;
    const view = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          editorTheme,
          syntaxHighlighting(sqlHighlighting),
          EditorView.contentAttributes.of({ 'aria-label': 'SQL 编辑器' }),
          language.current.of(sql({ dialect: SQLite })),
          sqlRunKeymap(() => callbacks.current.onRun()),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) callbacks.current.onSelectionChange(!update.state.selection.main.empty);
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // Create once; subsequent value and schema changes use editor transactions.
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: language.current.reconfigure(sql({
        dialect: SQLite,
        schema: Object.fromEntries(schema.map((table) => [table.name, table.columns.map((column) => column.name)])),
      })),
    });
  }, [schema]);

  return <div ref={container} className="sql-editor" />;
});
