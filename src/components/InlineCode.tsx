interface Props {
  children: string;
}

// 仅解析成对的反引号，不解析 HTML，文档内容始终由 React 安全输出。
export function InlineCode({ children }: Props) {
  return children.split(/(`[^`\n]+`)/g).map((part, index) => (
    part.startsWith('`') && part.endsWith('`') && part.length > 2
      ? <code className="docs-inline-code" key={index}>{part.slice(1, -1)}</code>
      : part
  ));
}
