import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Lightbulb, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exercises } from '../data/exercises';
import type { ValidationResult } from '../database/validateExercise';

interface Props {
  completed: number[];
  onComplete: (id: number) => void;
  onLoad: (sql: string) => void;
  getSql: () => string;
  editorValue: string;
  selectionVersion: number;
}

export function Exercises({ completed, onComplete, onLoad, getSql, editorValue, selectionVersion }: Props) {
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const exercise = exercises[index];
  const isComplete = completed.includes(exercise.id);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setValidation(null);
    setValidating(false);
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      clearTimeout(timeoutRef.current);
    };
  }, [index, editorValue, selectionVersion]);

  function validate() {
    workerRef.current?.terminate();
    clearTimeout(timeoutRef.current);
    setValidating(true);
    setValidation(null);
    try {
      const worker = new Worker(new URL('../database/exercise.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      const finish = (result: ValidationResult) => {
        if (workerRef.current !== worker) return;
        worker.terminate();
        workerRef.current = null;
        clearTimeout(timeoutRef.current);
        setValidating(false);
        setValidation(result);
      };
      worker.onmessage = (event: MessageEvent<ValidationResult>) => finish(event.data);
      worker.onerror = () => finish({ passed: false, message: '校验引擎加载失败，请重试。' });
      timeoutRef.current = setTimeout(() => finish({ passed: false, message: '校验超过 5 秒已停止，请简化查询。当前实验库未受影响。' }), 5000);
      worker.postMessage({ id: exercise.id, sql: getSql() });
    } catch {
      setValidating(false);
      setValidation({ passed: false, message: '无法启动校验引擎，请重试。' });
    }
  }

  function selectExercise(next: number) {
    setIndex(next);
    setShowHint(false);
    setShowAnswer(false);
  }

  return (
    <aside className="exercise-panel">
      <div className="exercise-heading">
        <BookOpen size={17} /><strong>每日一点 SQL</strong><span>练习册</span>
      </div>
      <div className="progress-label">
        <span>你的学习进度</span><strong>{completed.length} / {exercises.length}</strong>
      </div>
      <div className="progress-track">
        <div style={{ width: `${completed.length / exercises.length * 100}%` }} />
      </div>
      <div className="exercise-picker">
        <select
          aria-label="选择练习题"
          value={index}
          onChange={(event) => selectExercise(Number(event.target.value))}
        >
          {exercises.map((item, itemIndex) => (
            <option key={item.id} value={itemIndex}>
              {completed.includes(item.id) ? '✓ ' : ''}
              {String(item.id).padStart(2, '0')} · {item.title}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </div>
      <div className="exercise-body">
        <span className="topic-tag">{exercise.topic}</span>
        <h2>{exercise.title}</h2>
        <p>{exercise.description}</p>
        <button
          className="exercise-start"
          onClick={() => onLoad(`-- 练习 ${exercise.id}：${exercise.title}\n-- ${exercise.description}\n\n`)}
        >
          <Play size={14} /> 开始这道练习 <ArrowRight size={14} />
        </button>
        <div className="exercise-disclosure">
          <button aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
            <Lightbulb size={15} /> 给我一点提示
            <ChevronDown size={14} className={showHint ? 'rotated' : ''} />
          </button>
          {showHint && <p>{exercise.hint}</p>}
        </div>
        <div className="exercise-disclosure">
          <button aria-expanded={showAnswer} onClick={() => setShowAnswer(!showAnswer)}>
            <BookOpen size={15} /> 查看参考答案
            <ChevronDown size={14} className={showAnswer ? 'rotated' : ''} />
          </button>
          {showAnswer && (
            <div className="answer">
              <pre>{exercise.answer}</pre>
              <button onClick={() => onLoad(exercise.answer)}>
                载入编辑器 <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
        <button
          className={`complete-button ${isComplete ? 'completed' : ''}`}
          onClick={() => onComplete(exercise.id)}
        >
          <Check size={15} /> {isComplete ? '已掌握 · 点击撤销' : '我已掌握这道题'}
        </button>
        {exercise.id <= 18 && (
          <button className="exercise-validate secondary-button" disabled={validating || !editorValue.trim()} onClick={validate}>
            {validating ? '正在校验…' : '验证当前 SQL 结果'}
          </button>
        )}
        {validation && (
          <p className={`exercise-validation ${validation.passed ? 'passed' : ''}`} role="status">{validation.message}</p>
        )}
        <small className="self-review">{exercise.id <= 18 ? '校验选中 SQL（无选区则全部），使用独立默认库；别名不限，列顺序需一致，不自动标记掌握。' : '修改与事务题请参照答案自主验证并标记进度。'}</small>
      </div>
      <div className="exercise-navigation">
        <button disabled={index === 0} onClick={() => selectExercise(index - 1)}>
          <ArrowLeft size={14} /> 上一题
        </button>
        <span>{String(index + 1).padStart(2, '0')} / 20</span>
        <button disabled={index === exercises.length - 1} onClick={() => selectExercise(index + 1)}>
          下一题 <ArrowRight size={14} />
        </button>
      </div>
      <div className="learning-note">
        <span>✦</span><strong>放手试，数据可以重来。</strong>
        <p>增删改查都可以在这里练习。点击重置，随时回到最初的样子。</p>
      </div>
    </aside>
  );
}
