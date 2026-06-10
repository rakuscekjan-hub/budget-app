// Midnight resets + streak tracking. Runs once on mount and then re-checks
// every 30s so a session that crosses midnight rolls over live.

import { useEffect } from 'react'
import { todayKey, weekKey } from '../systems/fomoClock'

export function useDailyReset(save, setSave) {
  useEffect(() => {
    function check() {
      const today = todayKey()
      const week = weekKey()
      setSave((s) => {
        if (s.lastLoginDate === today && s.weekKey === week) return s
        const next = { ...s }

        if (s.lastLoginDate !== today) {
          const yesterday = todayKey(new Date(Date.now() - 86400000))
          // Streak: continues if last login was yesterday, else resets to day 1.
          next.streak = s.lastLoginDate === yesterday ? s.streak + 1 : 1
          next.lastLoginDate = today
          next.dailyQuestKills = 0
          next.dailyQuestDate = today
        }

        if (s.weekKey !== week) {
          next.weekKey = week
          next.legendariesThisWeek = 0
          next.weeklyBestFloor = 0
          next.guildContribution = 0
        }

        return next
      })
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
    // setSave is stable (useState setter); run once.
  }, [setSave])
}
