import { SQLite } from '@codemirror/lang-sql';
import { classHighlighter, highlightCode } from '@lezer/highlight';
import { ArrowUpRight, Check, Code2, Copy, Database, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  sql: string;
  onPractice: (sql: string) => void;
}

interface CodeToken {
  text: string;
  classes: string;
}

export function SqlExample({ sql, onPractice }: Props) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lines = useMemo(() => {
    const result: CodeToken[][] = [[]];
    highlightCode(
      sql,
      SQLite.language.parser.parse(sql),
      classHighlighter,
      (text, classes) => result[result.length - 1].push({ text, classes }),
      () => result.push([]),
    );
    return result;
  }, [sql]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  async function copySql() {
    clearTimeout(timerRef.current);
    try {
      await navigator.clipboard.writeText(sql);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    timerRef.current = setTimeout(() => setCopyStatus('idle'), 3000);
  }

  return (
    <section className="docs-example" aria-label="SQL 示例">
      <header className="example-heading">
        <div className="example-title">
          <span className="example-icon"><Code2 size={19} /></span>
          <div><h3>动手试一试</h3><p>读懂语句，再亲手运行一次。</p></div>
        </div>
        <span className="example-dataset"><Database size={13} /> 学生成绩库</span>
      </header>
      <div className="example-code-panel">
        <div className="example-code-toolbar">
          <span><span className="example-file-dot" /> example.sql <span className="example-language">SQL</span></span>
          <button onClick={copySql} aria-label="复制示例 SQL">
            {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            {copyStatus === 'copied' ? '已复制' : '复制代码'}
          </button>
        </div>
        <pre className="example-code" tabIndex={0} aria-label="示例 SQL 代码">
          <code>
            {lines.map((tokens, index) => (
              <span className="example-code-line" key={index}>
                <span className="example-line-number" aria-hidden="true">{index + 1}</span>
                <span className="example-line-content">
                  {tokens.map((token, tokenIndex) => (
                    <span className={token.classes || undefined} key={tokenIndex}>{token.text}</span>
                  ))}
                  {index < lines.length - 1 ? '\n' : null}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
      <footer className="example-footer">
        <span role="status">
          {copyStatus === 'error' ? '复制失败，请选中代码后手动复制。' : '载入后可自由修改，点击运行查看结果。'}
        </span>
        <button className="run-button" onClick={() => onPractice(sql)}>
          <Play size={14} fill="currentColor" /> 载入实验台 <ArrowUpRight size={14} />
        </button>
      </footer>
    </section>
  );
}
