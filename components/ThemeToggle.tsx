'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-8 h-8 flex items-center justify-center rounded-lg
                 text-slate-500 hover:text-slate-800 hover:bg-slate-100
                 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800
                 transition"
      title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
