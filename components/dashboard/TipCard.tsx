'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/calculations'
import { updateTipStatus, markTipDoneAndDeactivate } from '@/app/(app)/dashboard/actions'
import type { GeneratedTip } from '@/types/database'

export default function TipCard({ tip }: { tip: GeneratedTip }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  async function handleDone() {
    if (tip.expense_id) {
      setShowDeactivate(true)
      return
    }
    setLoading(true)
    await markTipDoneAndDeactivate(tip.id, null)
    router.refresh()
    setLoading(false)
  }

  async function handleDoneWithDeactivate(deactivate: boolean) {
    setLoading(true)
    await markTipDoneAndDeactivate(tip.id, deactivate ? tip.expense_id : null)
    router.refresh()
    setLoading(false)
    setShowDeactivate(false)
  }

  async function handleDismiss() {
    setLoading(true)
    await updateTipStatus(tip.id, 'dismissed')
    router.refresh()
    setLoading(false)
  }

  async function handleSnooze() {
    setLoading(true)
    await updateTipStatus(tip.id, 'snoozed')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-5 border-l-4 border-brand-500">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-brand-50 text-brand-600">Tip van vandaag</span>
            {tip.estimated_saving_monthly > 0 && (
              <span className="badge bg-emerald-50 text-emerald-700">
                +{formatCurrency(tip.estimated_saving_monthly)}/m
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{tip.title}</h3>
        </div>
      </div>

      <p className="text-slate-600 text-sm leading-relaxed mb-4">{tip.message}</p>

      {showDeactivate ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Zet de bijbehorende post ook op inactief (opgezegd)?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDoneWithDeactivate(true)}
              disabled={loading}
              className="btn-primary flex-1 text-xs"
            >
              Ja, zet op inactief
            </button>
            <button
              onClick={() => handleDoneWithDeactivate(false)}
              disabled={loading}
              className="btn-secondary flex-1 text-xs"
            >
              Nee, alleen markeren
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDone}
            disabled={loading}
            className="btn-primary text-xs"
          >
            ✓ {tip.action_cta}
          </button>
          <button
            onClick={handleSnooze}
            disabled={loading}
            className="btn-secondary text-xs"
          >
            ⏰ Morgen
          </button>
          <button
            onClick={handleDismiss}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 transition"
          >
            Negeer
          </button>
        </div>
      )}
    </div>
  )
}
