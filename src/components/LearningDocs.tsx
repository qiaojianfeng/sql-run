import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, List, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { lessons } from '../data/lessons';
import { InlineCode } from './InlineCode';
import { SqlExample } from './SqlExample';

interface Props {
  onPractice: (sql: string) => void;
  isDefault: boolean;
}

export function LearningDocs({ onPractice, isDefault }: Props) {
  const [selectedId, setSelectedId] = useState(lessons[0].id);
  const [search, setSearch] = useState('');
  const articleRef = useRef<HTMLElement>(null);
  const index = lessons.findIndex((lesson) => lesson.id === selectedId);
  const lesson = lessons[index];
  const query = search.trim().toLocaleLowerCase();
  const matches = lessons.filter((item) => (
    [
      item.title, item.category, item.summary, item.sql, item.note,
      item.walkthrough, item.challenge, ...item.goals,
      ...item.sections.flatMap((section) => [
        section.title, section.text, ...(section.items ?? []),
        ...(section.table?.headers ?? []), ...(section.table?.rows.flat() ?? []),
      ]),
    ]
      .join(' ').toLocaleLowerCase().includes(query)
  ));
  const categories = [...new Set(matches.map((item) => item.category))];
  const readingLength = [
    lesson.summary, lesson.note, lesson.walkthrough, lesson.challenge,
    ...lesson.sections.map((section) => section.text),
  ].join('').length;
  const readingMinutes = Math.max(3, Math.ceil(readingLength / 300));

  function selectLesson(id: string) {
    setSelectedId(id);
    articleRef.current?.scrollIntoView({ block: 'start' });
    articleRef.current?.focus({ preventScroll: true });
  }

  function jumpToSection(id: string) {
    const heading = document.getElementById(id);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }

  return (
    <div className="workspace-content docs-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span /> SQL LEARNING GUIDE</div>
          <h1>从读懂，到写出 SQL<span>。</span></h1>
          <p>12 篇内置教程，从基础查询到事务与索引，结合实验数据边学边练。</p>
        </div>
      </div>
      {!isDefault && (
        <div className="notice" role="status">
          当前使用自定义实验库。本页示例需要默认学习库，点击「载入实验台」时可切换，自定义数据会保留。
        </div>
      )}
      <div className="docs-layout">
        <nav className="docs-directory" aria-label="学习文档目录">
          <label className="docs-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="搜索学习文档"
              placeholder="搜索知识点或 SQL…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <p className="docs-count">{query ? `找到 ${matches.length} 篇文档` : '学习目录 · 12 篇'}</p>
          {categories.map((category) => (
            <div className="docs-category" key={category}>
              <h2>{category}</h2>
              {matches.filter((item) => item.category === category).map((item) => (
                <button
                  key={item.id}
                  className={selectedId === item.id ? 'active' : ''}
                  aria-current={selectedId === item.id ? 'page' : undefined}
                  onClick={() => selectLesson(item.id)}
                >
                  <BookOpen size={14} /><span>{item.title}</span>
                </button>
              ))}
            </div>
          ))}
          {matches.length === 0 && <p className="docs-no-matches" role="status">没有找到相关文档，试试 JOIN、事务或分组。</p>}
        </nav>
        <article className="docs-article" ref={articleRef} tabIndex={-1} aria-label={lesson.title}>
          <div className="docs-article-meta">
            <span className="topic-tag">{lesson.category}</span>
            <span><Clock3 size={14} /> 约 {readingMinutes} 分钟阅读 <span aria-hidden="true">·</span> {index + 1} / {lessons.length}</span>
          </div>
          <h2>{lesson.title}</h2>
          <p className="docs-summary">{lesson.summary}</p>
          <div className="docs-learning-goals">
            <h3>这篇你将学会</h3>
            <ul>
              {lesson.goals.map((goal) => <li key={goal}><Check size={15} /><InlineCode>{goal}</InlineCode></li>)}
            </ul>
          </div>
          <nav className="docs-outline" aria-label="本篇章节">
            <span><List size={15} /> 本篇内容</span>
            <div>
              {lesson.sections.map((section, sectionIndex) => (
                <button key={section.title} onClick={() => jumpToSection(`${lesson.id}-section-${sectionIndex}`)}>
                  <span>{String(sectionIndex + 1).padStart(2, '0')}</span>{section.title}
                </button>
              ))}
            </div>
          </nav>
          {lesson.sections.map((section, sectionIndex) => (
            <section className="docs-section" key={section.title}>
              <h3 id={`${lesson.id}-section-${sectionIndex}`} tabIndex={-1}>
                <span className="docs-section-number" aria-hidden="true">{String(sectionIndex + 1).padStart(2, '0')}</span>
                {section.title}
              </h3>
              {section.text.split('\n\n').map((paragraph) => (
                <p key={paragraph}><InlineCode>{paragraph}</InlineCode></p>
              ))}
              {section.items && (
                <ul className="docs-prose-list">
                  {section.items.map((item) => <li key={item}><InlineCode>{item}</InlineCode></li>)}
                </ul>
              )}
              {section.table && (
                <div className="docs-table-scroll" role="region" aria-label={`${section.title}对照表`} tabIndex={0}>
                  <table className="docs-reference-table">
                    <caption>{section.title} · 速查对照</caption>
                    <thead><tr>{section.table.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
                    <tbody>
                      {section.table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineCode>{cell}</InlineCode></td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
          <SqlExample key={lesson.id} sql={lesson.sql} onPractice={onPractice} />
          <section className="docs-result-guide">
            <h3>运行后，重点看这里</h3>
            <p><InlineCode>{lesson.walkthrough}</InlineCode></p>
          </section>
          <section className="docs-challenge">
            <div className="docs-challenge-label">YOUR TURN <span>巩固练习</span></div>
            <p><InlineCode>{lesson.challenge}</InlineCode></p>
            <span className="docs-challenge-hint">载入上方示例，尝试修改后运行，用结果验证你的理解。</span>
          </section>
          <aside className="docs-callout"><strong>学习提醒</strong><p><InlineCode>{lesson.note}</InlineCode></p></aside>
          <p className="docs-compatibility">本地示例由 SQLite 执行。MySQL 专项行为和语法差异会单独说明。</p>
          <div className="docs-pagination">
            <button disabled={index === 0} onClick={() => selectLesson(lessons[index - 1].id)}>
              <ArrowLeft size={15} /> 上一篇
            </button>
            <span>{index + 1} / {lessons.length}</span>
            <button disabled={index === lessons.length - 1} onClick={() => selectLesson(lessons[index + 1].id)}>
              下一篇 <ArrowRight size={15} />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
