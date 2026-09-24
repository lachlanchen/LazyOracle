import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

const prefix = 'lazyoracle.practice.'
export function readPracticeState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(prefix + key)
    return raw === null ? fallback : JSON.parse(raw) as T
  } catch { return fallback }
}
export function savePracticeState<T>(key: string, value: T): void {
  try { localStorage.setItem(prefix + key, JSON.stringify(value)) } catch { /* Keep the in-memory result if storage is full. */ }
}

/** Mount a new component for a different key. No camera images or loading flags belong here. */
export function usePracticeState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readPracticeState(key, typeof initial === 'function' ? (initial as () => T)() : initial))
  useEffect(() => { savePracticeState(key, value) }, [key, value])
  return [value, setValue]
}

/** A stable cache identity for exact computed facts, including changed profiles. */
export function readingFingerprint(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}
