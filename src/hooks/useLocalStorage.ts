import { useRef, useState } from 'react';

export function useLocalStorage<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const [storageError, setStorageError] = useState(false);
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      const parsed: unknown = saved === null ? fallback : JSON.parse(saved);
      return validate(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });

  const valueRef = useRef(value);

  function update(next: T | ((current: T) => T)) {
    const resolved = typeof next === 'function' ? (next as (current: T) => T)(valueRef.current) : next;
    valueRef.current = resolved;
    setValue(resolved);
    try {
      localStorage.setItem(key, JSON.stringify(resolved));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  return [value, update, storageError] as const;
}
