// src/components/workflow/WorkflowCard.tsx
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Trash2,
  GitBranch,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { Workflow } from "@/types"

interface Props {
  workflow: Workflow
  executionCount: number
  onToggle: (id: string) => void
  onRun: (workflow: Workflow) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  isToggling?: boolean
}

export function WorkflowCard({
  workflow,
  executionCount,
  onToggle,
  onRun,
  onDuplicate,
  onDelete,
  isToggling,
}: Props) {
  const navigate = useNavigate()

  const triggerNode = workflow.nodes.find((n) => n.category === "trigger")
  const triggerLabel = triggerNode?.label ?? "No trigger"

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{workflow.name}</h3>
          {workflow.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={workflow.isActive}
            onCheckedChange={() => onToggle(workflow.id)}
            disabled={isToggling}
            aria-label="Toggle workflow active"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}/edit`)}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRun(workflow)}>
                <Play size={14} className="mr-2" /> Run now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(workflow.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Trigger info */}
      <div className="flex items-center gap-1.5 mb-3">
        <GitBranch size={12} className="text-slate-400" />
        <span className="text-xs text-slate-500">{triggerLabel}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <StatusBadge status={workflow.isActive ? "active" : "inactive"} />
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{executionCount} runs</span>
          {workflow.lastRunAt && (
            <span>
              {formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
