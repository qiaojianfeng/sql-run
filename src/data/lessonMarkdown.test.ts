import { describe, expect, it } from 'vitest';
import { loadLessons, parseLessonMarkdown } from './lessonMarkdown';

const source = `---
id: demo
order: 1
category: 查询基础
summary: 测试摘要
---

# 测试教程

## 学习目标

- 学会查询
- 理解结果

## 正文章节

第一段 **重点**。

第二段 [链接](https://example.com)。

| 字段 | 含义 |
| --- | --- |
| \`id\` | 编号 |

### 补充说明

\`\`\`text
## 代码里的标题
\`\`\`

## SQL 示例

\`\`\`sql
SELECT id, name
FROM students;
\`\`\`

## 结果解读

每行一名学生。

## 巩固练习

增加 \`age\`。

## 学习提醒

使用默认库。
`;

describe('Markdown 教程加载', () => {
  it('解析元信息和辅助章节，保留正文段落、表格、子标题和代码块', () => {
    const lesson = parseLessonMarkdown(source, 'demo.md');
    expect(lesson).toMatchObject({
      id: 'demo', order: 1, title: '测试教程', category: '查询基础', summary: '测试摘要',
      goals: ['学会查询', '理解结果'], sql: 'SELECT id, name\nFROM students;',
      walkthrough: '每行一名学生。', challenge: '增加 `age`。', note: '使用默认库。',
    });
    expect(lesson.sections).toHaveLength(1);
    expect(lesson.sections[0].text).toContain('第一段 **重点**。\n\n第二段');
    expect(lesson.sections[0].text).toContain('| `id` | 编号 |');
    expect(lesson.sections[0].text).toContain('### 补充说明');
    expect(lesson.sections[0].text).toContain('```text\n## 代码里的标题\n```');
    expect(parseLessonMarkdown(source.replaceAll('\n', '\r\n'), 'windows.md')).toEqual(lesson);
  });

  it.each([
    [source.replace('order: 1', 'order: 0'), 'order 必须为正整数'],
    [source.replace('summary: 测试摘要', ''), '缺少有效的 summary'],
    [source.replace('## 学习提醒\n\n使用默认库。', ''), '缺少章节内容：学习提醒'],
    [source.replace('```sql', '```js'), 'SQL 示例必须包含'],
    [source + '\n## 学习提醒\n\n重复内容。', '重复章节：学习提醒'],
  ])('格式错误包含文件名与具体原因', (markdown, error) => {
    expect(() => parseLessonMarkdown(markdown, 'broken.md')).toThrow(`broken.md: ${error}`);
  });

  it('按 order 排序并拒绝重复 id、重复顺序和空目录', () => {
    const second = source.replace('id: demo', 'id: second').replace('order: 1', 'order: 2');
    expect(loadLessons({ 'second.md': second, 'first.md': source }).map((lesson) => lesson.id)).toEqual(['demo', 'second']);
    expect(() => loadLessons({ 'a.md': source, 'b.md': source })).toThrow('id 重复');
    expect(() => loadLessons({ 'a.md': source, 'b.md': source.replace('id: demo', 'id: other') })).toThrow('order 重复');
    expect(() => loadLessons({})).toThrow('未找到学习文档');
  });
});
