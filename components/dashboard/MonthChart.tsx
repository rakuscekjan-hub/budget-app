'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/calculations'

interface MonthData {
  label: string   // "jan", "feb", etc.
  expenses: number
  income: number
  isCurrent: boolean
}

export default function MonthChart({ data }: { data: MonthData[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} barCategoryGap="30%" barGap={2}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          className="text-slate-400"
        />
        <YAxis hide />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'expenses' ? 'Uitgaven' : 'Inkomsten',
          ]}
          contentStyle={{
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            fontSize: '12px',
          }}
          cursor={{ fill: 'rgba(100,116,139,0.08)' }}
        />
        <Bar dataKey="expenses" radius={[4,4,0,0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isCurrent ? '#6366f1' : '#e2e8f0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
