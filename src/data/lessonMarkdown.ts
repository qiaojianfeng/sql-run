import { marked, type Tokens } from 'marked';
import { parse as parseYaml } from 'yaml';

export interface LessonSection {
  title: string;
  text: string;
}

export interface Lesson {
  id: string;
  order: number;
  category: string;
  title: string;
  summary: string;
  goals: string[];
  sections: LessonSection[];
  sql: string;
  walkthrough: string;
  challenge: string;
  note: string;
}

const specialSections = ['学习目标', 'SQL 示例', '结果解读', '巩固练习', '学习提醒'];

export function parseLessonMarkdown(source: string, filename: string): Lesson {
  function fail(message: string): never {
    throw new Error(`${filename}: ${message}`);
  }

  const frontmatter = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatter) fail('缺少 YAML frontmatter');
  let metadata: unknown;
  try {
    metadata = parseYaml(frontmatter[1]);
  } catch {
    fail('YAML frontmatter 格式错误');
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    fail('frontmatter 必须是字段对象');
  }
  const fields = metadata as Record<string, unknown>;
  function field(name: string): string {
    const value = fields[name];
    if (typeof value !== 'string' || !value.trim()) fail(`缺少有效的 ${name}`);
    return value.trim();
  }
  const id = field('id');
  if (!/^[a-z][a-z0-9-]*$/.test(id)) fail('id 必须使用小写字母、数字或连字符');
  const order = fields.order;
  if (typeof order !== 'number' || !Number.isSafeInteger(order) || order < 1) {
    fail('order 必须为正整数');
  }

  const tokens = marked.lexer(source.replace(/\r\n/g, '\n').slice(frontmatter[0].length));
  const titleIndex = tokens.findIndex((token) => token.type !== 'space');
  const title = tokens[titleIndex];
  if (title?.type !== 'heading' || title.depth !== 1) fail('正文必须以一级标题开头');
  const blocks: LessonSection[] = [];
  for (const token of tokens.slice(titleIndex + 1)) {
    if (token.type === 'space' && !blocks.length) continue;
    if (token.type === 'heading' && token.depth === 1) fail('只能有一个一级标题');
    if (token.type === 'heading' && token.depth === 2) {
      if (blocks.some((block) => block.title === token.text)) fail(`重复章节：${token.text}`);
      blocks.push({ title: token.text, text: '' });
    } else {
      if (!blocks.length) fail('请将正文放在二级标题下');
      blocks[blocks.length - 1].text += token.raw;
    }
  }
  for (const block of blocks) block.text = block.text.trim();
  function section(name: string): string {
    const block = blocks.find((item) => item.title === name);
    if (!block?.text) fail(`缺少章节内容：${name}`);
    return block.text;
  }
  const goalsTokens = marked.lexer(section('学习目标')).filter((token) => token.type !== 'space');
  const goalList = goalsTokens[0];
  if (goalsTokens.length !== 1 || goalList?.type !== 'list' || goalList.ordered) {
    fail('学习目标必须使用无序列表');
  }
  const sqlTokens = marked.lexer(section('SQL 示例')).filter((token) => token.type !== 'space');
  const sqlBlock = sqlTokens[0];
  if (sqlTokens.length !== 1 || sqlBlock?.type !== 'code' || sqlBlock.lang !== 'sql' || !sqlBlock.text.trim()) {
    fail('SQL 示例必须包含一个非空的 sql 围栏代码块');
  }
  const sections = blocks.filter((block) => !specialSections.includes(block.title));
  if (!sections.length || sections.some((block) => !block.text)) fail('至少需要一个非空的正文章节');

  return {
    id, order, category: field('category'), summary: field('summary'), title: title.text,
    goals: goalList.items.map((item: Tokens.ListItem) => item.text), sections, sql: sqlBlock.text,
    walkthrough: section('结果解读'), challenge: section('巩固练习'), note: section('学习提醒'),
  };
}

export function loadLessons(files: Record<string, string>): Lesson[] {
  const lessons = Object.entries(files).map(([filename, source]) => parseLessonMarkdown(source, filename));
  if (!lessons.length) throw new Error('未找到学习文档');
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) throw new Error(`学习文档 id 重复：${lesson.id}`);
    if (orders.has(lesson.order)) throw new Error(`学习文档 order 重复：${lesson.order}`);
    ids.add(lesson.id);
    orders.add(lesson.order);
  }
  return lessons.sort((a, b) => a.order - b.order);
}
