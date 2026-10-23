import { loadLessons } from './lessonMarkdown';

// Vite 将 Markdown 打包为本地文本；新增、修改文件时自动更新。
const files = import.meta.glob<string>('../content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const lessons = loadLessons(files);
