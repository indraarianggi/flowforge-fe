// src/app/routes/execution-monitor.tsx
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronRight,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { NodeExecutionRow } from "@/components/execution/NodeExecutionRow"
import { useExecution } from "@/hooks/useExecutions"
import { useExecutionStore } from "@/stores/executionStore"
import type { Execution } from "@/types"

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: "blue" | "green" | "red" | "amber"
}) {
  const accentClass = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    red: "text-red-600 bg-red-50 border-red-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
  }[accent ?? "blue"]

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${accentClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export function ExecutionMonitorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: storedExecution, isLoading } = useExecution(id ?? "")
  const { liveExecution, isSimulating } = useExecutionStore()

  // Use live execution if it matches this ID, otherwise use stored
  const execution: Execution | null =
    liveExecution?.id === id ? liveExecution : storedExecution ?? null

  const isLive = isSimulating && liveExecution?.id === id

  if (isLoading && !execution) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
        <Loader2 size={24} className="animate-spin text-slate-300" />
        <p className="text-sm text-slate-400">Loading execution…</p>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Activity size={22} className="text-slate-400" />
        </div>
        <p className="text-slate-700 font-semibold mb-1">Execution not found</p>
        <p className="text-sm text-slate-400 mb-4">
          This execution may have been deleted or doesn&apos;t exist.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  const completedNodes = execution.nodeExecutions.filter(
    (ne) => ne.status === "success" || ne.status === "failed"
  ).length
  const totalNodes = execution.nodeExecutions.length

  const durationText =
    execution.durationMs != null
      ? execution.durationMs < 1000
        ? `${execution.durationMs}ms`
        : `${(execution.durationMs / 1000).toFixed(1)}s`
      : isLive
      ? "Running…"
      : "—"

  return (
    <div className="min-h-full bg-slate-50/50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="hover:text-slate-700 transition-colors flex items-center gap-1"
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <ChevronRight size={11} className="text-slate-300" />
          <Link
            to={`/workflows/${execution.workflowId}/executions`}
            className="hover:text-slate-700 transition-colors truncate max-w-[180px]"
          >
            {execution.workflowName}
          </Link>
          <ChevronRight size={11} className="text-slate-300" />
          <span className="text-slate-600 font-mono">{execution.id}</span>
        </nav>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {execution.workflowName}
                </h1>
                <StatusBadge status={execution.status} size="md" />
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-semibold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    <RefreshCw size={10} className="animate-spin" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Started{" "}
                {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                {" · "}
                <span className="capitalize">{execution.mode}</span> trigger
              </p>
            </div>
          </div>

          {/* Progress bar (live mode) */}
          {isLive && totalNodes > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Progress</span>
                <span className="font-mono">
                  {completedNodes} / {totalNodes} nodes
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(completedNodes / totalNodes) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <SummaryCard
            icon={<Clock size={15} />}
            label="Duration"
            value={durationText}
            accent="amber"
          />
          <SummaryCard
            icon={<CheckCircle2 size={15} />}
            label="Nodes"
            value={`${completedNodes} / ${totalNodes}`}
            accent={execution.status === "failed" ? "red" : "green"}
          />
          <SummaryCard
            icon={<Activity size={15} />}
            label="Trigger"
            value={execution.mode.charAt(0).toUpperCase() + execution.mode.slice(1)}
            accent="blue"
          />
        </div>

        {/* Error summary */}
        {execution.status === "failed" && execution.errorMessage && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
            <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-0.5">Execution failed</p>
              <p className="text-sm text-red-600">{execution.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Node execution timeline */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Node Timeline</h2>
            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {execution.nodeExecutions.length} steps
            </span>
          </div>

          {execution.nodeExecutions.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-200/80">
              <Loader2 size={20} className="animate-spin text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Waiting for execution to start…</p>
            </div>
          ) : (
            <div className="space-y-3">
              {execution.nodeExecutions.map((ne, idx) => (
                <NodeExecutionRow
                  key={ne.id}
                  nodeExecution={ne}
                  isLast={idx === execution.nodeExecutions.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {execution.status !== "running" && (
          <div className="mt-8 pt-5 border-t border-slate-200/80 flex items-center justify-between">
            <Link
              to={`/workflows/${execution.workflowId}/executions`}
              className="text-sm text-primary hover:underline font-medium"
            >
              View all executions →
            </Link>
            {execution.finishedAt && (
              <p className="text-xs text-slate-400">
                Finished {formatDistanceToNow(new Date(execution.finishedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
