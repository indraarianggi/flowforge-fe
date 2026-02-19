// src/components/execution/NodeExecutionRow.tsx
import { useState } from "react"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  MinusCircle,
  ArrowRight,
  RotateCcw,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { JsonViewer } from "@/components/shared/JsonViewer"
import type { NodeExecution } from "@/types"

function StatusIcon({ status }: { status: NodeExecution["status"] }) {
  switch (status) {
    case "success":
      return <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
    case "failed":
      return <XCircle size={16} className="text-red-500 flex-shrink-0" />
    case "running":
      return <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
    case "skipped":
      return <MinusCircle size={16} className="text-slate-400 flex-shrink-0" />
    default:
      return <Clock size={16} className="text-slate-300 flex-shrink-0" />
  }
}

const statusConfig = {
  success: {
    border: "border-emerald-200/80",
    bg: "bg-emerald-50/40",
    indicator: "bg-emerald-400",
    glow: "",
  },
  failed: {
    border: "border-red-200/80",
    bg: "bg-red-50/40",
    indicator: "bg-red-400",
    glow: "shadow-[0_0_0_3px_rgba(239,68,68,0.08)]",
  },
  running: {
    border: "border-blue-200/80",
    bg: "bg-blue-50/30",
    indicator: "bg-blue-400",
    glow: "shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
  },
  skipped: {
    border: "border-slate-200/80",
    bg: "bg-slate-50/60",
    indicator: "bg-slate-300",
    glow: "",
  },
  pending: {
    border: "border-slate-200/60",
    bg: "bg-white",
    indicator: "bg-slate-200",
    glow: "",
  },
} as const

interface Props {
  nodeExecution: NodeExecution
  isLast?: boolean
}

export function NodeExecutionRow({ nodeExecution, isLast }: Props) {
  const [expanded, setExpanded] = useState(nodeExecution.status === "failed")

  const config = statusConfig[nodeExecution.status] ?? statusConfig.pending

  const durationText =
    nodeExecution.durationMs != null
      ? nodeExecution.durationMs < 1000
        ? `${nodeExecution.durationMs}ms`
        : `${(nodeExecution.durationMs / 1000).toFixed(2)}s`
      : null

  const hasExpandable =
    nodeExecution.errorMessage ||
    nodeExecution.inputData ||
    nodeExecution.outputData ||
    nodeExecution.status === "skipped"

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[19px] top-[48px] w-px h-[calc(100%+12px)] bg-slate-200 -z-10" />
      )}

      <div
        className={cn(
          "rounded-xl border transition-all duration-200",
          config.border,
          config.bg,
          config.glow
        )}
      >
        {/* Header row */}
        <button
          onClick={() => hasExpandable && setExpanded(!expanded)}
          className={cn(
            "w-full flex items-center gap-3 p-4",
            hasExpandable ? "cursor-pointer" : "cursor-default"
          )}
          disabled={!hasExpandable}
        >
          {/* Status indicator dot + icon */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                nodeExecution.status === "running" ? "bg-blue-100" :
                nodeExecution.status === "success" ? "bg-emerald-100" :
                nodeExecution.status === "failed" ? "bg-red-100" :
                "bg-slate-100"
              )}
            >
              <StatusIcon status={nodeExecution.status} />
            </div>
            {nodeExecution.status === "running" && (
              <span className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                Step {nodeExecution.stepIndex + 1}
              </span>
              {nodeExecution.branchPath && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium",
                    nodeExecution.branchPath === "true"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  <ArrowRight size={8} />
                  {nodeExecution.branchPath}
                </span>
              )}
              {nodeExecution.loopIteration != null && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  <RotateCcw size={8} />
                  Iter {nodeExecution.loopIteration + 1}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {nodeExecution.nodeLabel}
            </p>
          </div>

          {/* Right meta */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-shrink-0">
            {durationText && (
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Zap size={10} className="text-amber-400" />
                {durationText}
              </span>
            )}
            {hasExpandable &&
              (expanded ? (
                <ChevronDown size={14} className="text-slate-300" />
              ) : (
                <ChevronRight size={14} className="text-slate-300" />
              ))}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
            {/* Error message */}
            {nodeExecution.errorMessage && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[11px] font-semibold text-red-700 mb-1 uppercase tracking-wide">
                  Error
                </p>
                <p className="text-xs text-red-600 font-mono">{nodeExecution.errorMessage}</p>
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <span>💡</span>
                  <span>Check the URL, credentials, and input data format.</span>
                </p>
              </div>
            )}

            {/* Skipped message */}
            {nodeExecution.status === "skipped" && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">
                  This step was skipped — the condition routed execution to a different branch.
                </p>
              </div>
            )}

            {/* Input data */}
            {nodeExecution.inputData && (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Input
                </p>
                <JsonViewer data={nodeExecution.inputData} />
              </div>
            )}

            {/* Output data */}
            {nodeExecution.outputData && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Output
                </p>
                <JsonViewer data={nodeExecution.outputData} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
