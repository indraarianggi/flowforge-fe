// src/app/routes/execution-history.tsx
import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useExecutions } from "@/hooks/useExecutions"
import { useWorkflow } from "@/hooks/useWorkflows"
import { cn } from "@/lib/utils"
import type { ExecutionStatus } from "@/types"

type StatusFilter = ExecutionStatus | "all"
type SortOrder = "newest" | "oldest"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
]

const STATUS_LEFT_BORDER: Record<string, string> = {
  success: "border-l-emerald-400",
  failed: "border-l-red-400",
  running: "border-l-blue-400",
  cancelled: "border-l-slate-300",
  waiting: "border-l-amber-400",
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={15} className="text-emerald-500" />,
  failed: <XCircle size={15} className="text-red-500" />,
  running: <Zap size={15} className="text-blue-500 animate-pulse" />,
  cancelled: <Clock size={15} className="text-slate-400" />,
  waiting: <Clock size={15} className="text-amber-500" />,
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: "green" | "red" | "blue" | "slate"
}) {
  const accentMap = {
    green: "text-emerald-600",
    red: "text-red-600",
    blue: "text-blue-600",
    slate: "text-slate-700",
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", accentMap[accent ?? "slate"])}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SuccessRateBar({ rate }: { rate: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Success Rate</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-slate-700 tabular-nums">{rate}%</p>
        <TrendingUp size={14} className="text-emerald-500 mb-1.5" />
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  )
}

export function ExecutionHistoryPage() {
  const { id: workflowId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")

  const { data: workflow } = useWorkflow(workflowId ?? "")
  const { data: executions = [], isLoading } = useExecutions(workflowId)

  const filtered = executions
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      return sortOrder === "newest" ? diff : -diff
    })

  const successCount = executions.filter((e) => e.status === "success").length
  const failedCount = executions.filter((e) => e.status === "failed").length
  const successRate =
    executions.length > 0 ? Math.round((successCount / executions.length) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={22} className="animate-spin text-slate-300" />
        <p className="text-sm text-slate-400">Loading execution history…</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50/40">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb / back nav */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Dashboard
          </button>
          <ChevronRight size={11} className="text-slate-300" />
          <span className="text-slate-600 font-medium truncate max-w-[220px]">
            {workflow?.name ?? "Workflow"}
          </span>
          <ChevronRight size={11} className="text-slate-300" />
          <span className="text-slate-500">Execution History</span>
        </nav>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            {workflow?.name ?? "Workflow"} — Execution History
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All runs for this workflow, sorted by date.
          </p>
        </div>

        {/* Stats row */}
        {executions.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-7">
            <StatCard label="Total Runs" value={executions.length} accent="slate" />
            <StatCard
              label="Succeeded"
              value={successCount}
              sub={`of ${executions.length} runs`}
              accent="green"
            />
            <StatCard
              label="Failed"
              value={failedCount}
              sub={`of ${executions.length} runs`}
              accent="red"
            />
            <SuccessRateBar rate={successRate} />
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4">
          {/* Status segment filter */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  statusFilter === value
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-36 text-xs h-8 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-xs text-slate-400 font-medium">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Execution list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={History}
            title="No executions found"
            description={
              statusFilter === "all"
                ? "This workflow hasn't been run yet. Run it from the editor or dashboard."
                : `No ${statusFilter} executions for this workflow.`
            }
            action={
              statusFilter !== "all"
                ? { label: "Clear filter", onClick: () => setStatusFilter("all") }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((execution) => {
              const durationText =
                execution.durationMs != null
                  ? execution.durationMs < 1000
                    ? `${execution.durationMs}ms`
                    : `${(execution.durationMs / 1000).toFixed(1)}s`
                  : "—"

              const leftBorder =
                STATUS_LEFT_BORDER[execution.status] ?? "border-l-slate-200"
              const statusIcon = STATUS_ICON[execution.status]

              return (
                <button
                  key={execution.id}
                  onClick={() => navigate(`/executions/${execution.id}`)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-l-4 border-slate-200/80 transition-all text-left group",
                    leftBorder,
                    "hover:shadow-sm hover:border-slate-300"
                  )}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-6 flex items-center justify-center">
                    {statusIcon}
                  </div>

                  {/* Badge */}
                  <StatusBadge status={execution.status} />

                  {/* Timestamps */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {format(new Date(execution.startedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                      {" · "}
                      <span className="capitalize">{execution.mode}</span>
                      {" · "}
                      {execution.nodeExecutions.length} step
                      {execution.nodeExecutions.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0 min-w-[3rem] text-right">
                    {durationText}
                  </div>

                  {/* Error snippet */}
                  {execution.errorMessage && (
                    <div className="hidden md:block max-w-48 flex-shrink-0">
                      <p className="text-xs text-red-500 truncate">{execution.errorMessage}</p>
                    </div>
                  )}

                  {/* Arrow */}
                  <ChevronRight
                    size={14}
                    className="text-slate-300 flex-shrink-0 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"
                  />
                </button>
              )
            })}
          </div>
        )}

        {/* Footer link */}
        {filtered.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-200/60 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {executions.length} total executions
            </p>
            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="text-xs text-primary hover:underline font-medium"
              >
                View all executions →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
