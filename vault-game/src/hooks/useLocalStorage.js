import { useEffect, useRef, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw)
        // Merge so new fields added in updates get their defaults.
        return typeof initialValue === 'object' && !Array.isArray(initialValue)
          ? { ...initialValue, ...parsed }
          : parsed
      }
    } catch {
      /* corrupted save → start fresh */
    }
    return initialValue
  })

  const keyRef = useRef(key)
  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value))
    } catch {
      /* storage full/unavailable — keep playing in memory */
    }
  }, [value])

  return [value, setValue]
}
