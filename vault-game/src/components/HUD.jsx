// MECHANIC 3: ZEIGARNIK EFFECT — seven simultaneously visible progress bars.
// Targets are tuned so several bars naturally sit in the 60-90% band for an
// active player; nothing here is ever simply "done".

import { useGame } from '../hooks/useGameState'
import {
  masteryRank,
  seasonTier,
  SEASON_TIERS,
  SEASON_XP_PER_TIER,
  VAULT_MAX_FLOOR,
  DAILY_QUEST_TARGET,
  DAILY_QUEST_REWARD,
  WEEKLY_LEGENDARY_TARGET,
} from '../systems/progressionSystem'

function Bar({ glyph, label, value, max, detail, color = '#F5C842' }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="py-1.5">
      <div className="flex justify-between items-baseline text-xs mb-1">
        <span className="text-slate-300">
          {glyph} {label}
        </span>
        <span className="text-slate-500 text-[10px]">{detail}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function HUD() {
  const { save, nextMilestoneFloor } = useGame()
  const rank = masteryRank(save.masteryXP)
  const tier = seasonTier(save.seasonXP)
  const tierProgress = save.seasonXP - tier * SEASON_XP_PER_TIER
  const streakInWeek = ((Math.max(save.streak, 1) - 1) % 7) + 1

  return (
    <div className="panel px-4 py-2">
      <Bar
        glyph="🏛️"
        label={`Vault Depth: Floor ${save.bestFloor}/${VAULT_MAX_FLOOR}`}
        value={save.bestFloor % 5 || (save.bestFloor ? 5 : 0)}
        max={5}
        detail={`next milestone: Floor ${nextMilestoneFloor} reward`}
      />
      <Bar
        glyph="🗡️"
        label={`Daily Quest: Defeat ${Math.min(save.dailyQuestKills, DAILY_QUEST_TARGET)}/${DAILY_QUEST_TARGET} enemies today`}
        value={save.dailyQuestKills}
        max={DAILY_QUEST_TARGET}
        detail={save.dailyQuestKills >= DAILY_QUEST_TARGET ? 'complete! resets at midnight' : `reward: ${DAILY_QUEST_REWARD} VC`}
        color="#EF4444"
      />
      <Bar
        glyph="🌟"
        label={`Weekly: Collect ${Math.min(save.legendariesThisWeek, WEEKLY_LEGENDARY_TARGET)}/${WEEKLY_LEGENDARY_TARGET} legendary artifacts`}
        value={save.legendariesThisWeek}
        max={WEEKLY_LEGENDARY_TARGET}
        detail="this week"
        color="#F97316"
      />
      <Bar
        glyph="📖"
        label={`Artifact Codex: ${save.artifactsOwned.length}/200 artifacts`}
        value={save.artifactsOwned.length}
        max={200}
        detail="find them all"
        color="#8B5CF6"
      />
      <Bar
        glyph="🏅"
        label={`Vault Mastery: ${rank.name}`}
        value={rank.xpInRank}
        max={rank.xpNeeded}
        detail={rank.maxed ? 'MAX RANK' : `${rank.xpInRank}/${rank.xpNeeded} XP to ${rank.next}`}
        color="#38BDF8"
      />
      <Bar
        glyph="🎟️"
        label={`Season Pass: Tier ${tier}/${SEASON_TIERS}`}
        value={tierProgress}
        max={SEASON_XP_PER_TIER}
        detail={tier >= SEASON_TIERS ? 'season complete' : `${SEASON_XP_PER_TIER - tierProgress} XP to Tier ${tier + 1}`}
        color="#F5C842"
      />
      <Bar
        glyph="🔥"
        label={`${save.streak}-day login streak`}
        value={streakInWeek}
        max={7}
        detail={`Day ${streakInWeek + 1 > 7 ? 7 : streakInWeek + 1} gives ${streakInWeek >= 6 ? 'Rare Chest' : 'bigger bonus'}`}
        color="#FB923C"
      />
    </div>
  )
}
