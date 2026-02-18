// src/components/shared/StatusBadge.tsx
import { cn } from "@/lib/utils"
import type { ExecutionStatus } from "@/types"

interface Props {
  status: ExecutionStatus | "active" | "inactive"
  size?: "sm" | "md"
}

const config: Record<string, { label: string; classes: string }> = {
  active:    { label: "Active",    classes: "bg-green-100 text-green-700 border-green-200" },
  inactive:  { label: "Inactive",  classes: "bg-slate-100 text-slate-500 border-slate-200" },
  running:   { label: "Running",   classes: "bg-blue-100 text-blue-700 border-blue-200" },
  success:   { label: "Success",   classes: "bg-green-100 text-green-700 border-green-200" },
  failed:    { label: "Failed",    classes: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", classes: "bg-slate-100 text-slate-500 border-slate-200" },
  waiting:   { label: "Waiting",   classes: "bg-amber-100 text-amber-700 border-amber-200" },
}

export function StatusBadge({ status, size = "sm" }: Props) {
  const { label, classes } = config[status] ?? config.inactive
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        classes
      )}
    >
      {label}
    </span>
  )
}
