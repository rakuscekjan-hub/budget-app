import { formatCurrency, formatPct } from '@/lib/calculations'

interface Props {
  safeToSpend: number
  incomeMonthly: number
  fixedCostsMonthly: number
  fixedCostsRatio: number
}

export default function SafeToSpendCard({
  safeToSpend,
  incomeMonthly,
  fixedCostsMonthly,
  fixedCostsRatio,
}: Props) {
  const isPositive = safeToSpend >= 0
  const isWarning = fixedCostsRatio > 70
  const barWidth = Math.min(100, fixedCostsRatio)

  return (
    <div
      className={`rounded-2xl p-6 ${
        isPositive
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          : 'bg-gradient-to-br from-red-500 to-red-600'
      } text-white shadow-lg`}
    >
      <p className="text-emerald-100 text-sm font-medium mb-1">
        Vrij besteedbaar deze maand
      </p>

      <p className="text-5xl font-extrabold tracking-tight mb-1">
        {formatCurrency(safeToSpend)}
      </p>

      <p className="text-emerald-100 text-xs mb-5">per maand</p>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-emerald-100">
          <span>Vaste lasten</span>
          <span>{formatPct(fixedCostsRatio)} van inkomen</span>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isWarning ? 'bg-yellow-300' : 'bg-white'
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {isWarning && (
          <p className="text-yellow-200 text-xs font-medium">
            ⚠️ Vaste lasten &gt; 70% van inkomen — overweeg te snijden
          </p>
        )}
      </div>

      {/* Sub stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="bg-white/15 rounded-xl p-3">
          <p className="text-emerald-100 text-xs mb-0.5">Inkomen</p>
          <p className="text-white font-bold text-lg">{formatCurrency(incomeMonthly)}</p>
        </div>
        <div className="bg-white/15 rounded-xl p-3">
          <p className="text-emerald-100 text-xs mb-0.5">Vaste lasten</p>
          <p className="text-white font-bold text-lg">{formatCurrency(fixedCostsMonthly)}</p>
        </div>
      </div>
    </div>
  )
}
