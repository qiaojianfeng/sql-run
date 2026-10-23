import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  children: string;
  title?: string;
}

export function LessonMarkdown({ children, title = '文档' }: Props) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: ({ children, className }) => <code className={className ?? 'docs-inline-code'}>{children}</code>,
        pre: ({ children }) => <pre className="docs-markdown-code">{children}</pre>,
        ul: ({ children }) => <ul className="docs-prose-list">{children}</ul>,
        ol: ({ children }) => <ol className="docs-prose-list">{children}</ol>,
        h3: ({ children }) => <h4>{children}</h4>,
        h4: ({ children }) => <h5>{children}</h5>,
        h5: ({ children }) => <h6>{children}</h6>,
        table: ({ children }) => (
          <div className="docs-table-scroll" role="region" aria-label={`${title}对照表`} tabIndex={0}>
            <table className="docs-reference-table">
              <caption>{title} · 速查对照</caption>
              {children}
            </table>
          </div>
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
