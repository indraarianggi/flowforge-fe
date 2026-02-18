// src/components/shared/StatsBar.tsx
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Stat {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
}

interface Props {
  stats: Stat[]
}

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, trend }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
              {trend && (
                <p className={cn("text-xs mt-1", trend.positive ? "text-green-600" : "text-red-500")}>
                  {trend.value}
                </p>
              )}
            </div>
            <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
              <Icon size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
