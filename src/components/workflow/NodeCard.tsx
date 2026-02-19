// src/components/workflow/NodeCard.tsx
import { CheckCircle2, AlertCircle, XCircle, Minus, MoreHorizontal, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getNodeMeta } from "./nodeTypes"
import type { WorkflowNode } from "@/types"

interface Props {
  node: WorkflowNode
  stepNumber: string
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

function StatusIcon({ status }: { status: WorkflowNode["status"] }) {
  if (status === "tested")      return <CheckCircle2 size={14} className="text-emerald-500" />
  if (status === "configured")  return <Minus size={14} className="text-amber-400" />
  if (status === "error")       return <XCircle size={14} className="text-red-500" />
  return <AlertCircle size={14} className="text-slate-300" />
}

export function NodeCard({ node, stepNumber, isSelected, onClick, onDelete }: Props) {
  const meta = getNodeMeta(node.type)

  const borderAccent = {
    trigger:      "border-l-violet-400",
    action:       "border-l-blue-400",
    flow_control: "border-l-amber-400",
    integration:  "border-l-sky-400",
  }[node.category] ?? "border-l-slate-300"

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-4 p-3.5 cursor-pointer group",
        "hover:shadow-md hover:border-slate-300 transition-all duration-150",
        isSelected && "border-slate-300 shadow-md ring-2 ring-indigo-500/20 bg-indigo-50/30",
        borderAccent
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 font-medium",
          "transition-transform duration-150 group-hover:scale-105",
          meta.color
        )}>
          {meta.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{stepNumber}</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{meta.label}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{node.label}</p>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusIcon status={node.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 size={13} className="mr-2" /> Delete step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
