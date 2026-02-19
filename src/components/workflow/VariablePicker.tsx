// src/components/workflow/VariablePicker.tsx
import { useState } from "react"
import { Variable } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { WorkflowNode } from "@/types"

interface VariableEntry {
  expression: string
  label: string
  sampleValue: string
}

interface VariableGroup {
  nodeLabel: string
  stepNumber: string
  variables: VariableEntry[]
}

function buildVariableGroups(
  nodes: WorkflowNode[],
  nodeOrder: string[],
  currentNodeId: string
): VariableGroup[] {
  const currentIdx = nodeOrder.indexOf(currentNodeId)
  const previousNodeIds = nodeOrder.slice(0, currentIdx)

  const groups: VariableGroup[] = []

  // $trigger always available
  const triggerNode = nodes.find((n) => n.category === "trigger")
  if (triggerNode) {
    groups.push({
      nodeLabel: triggerNode.label,
      stepNumber: "trigger",
      variables: [
        { expression: "{{ $trigger.json }}", label: "All trigger data", sampleValue: "{ ... }" },
        { expression: "{{ $trigger.json.body }}", label: "body", sampleValue: "{ ... }" },
        { expression: "{{ $trigger.json.headers }}", label: "headers", sampleValue: "{ ... }" },
      ],
    })
  }

  // Previous steps
  previousNodeIds.forEach((nodeId, idx) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.category === "trigger") return
    const stepN = idx + 1
    groups.push({
      nodeLabel: node.label,
      stepNumber: String(stepN),
      variables: [
        { expression: `{{ $steps[${stepN}].json }}`, label: "All output", sampleValue: "{ ... }" },
        { expression: `{{ $steps[${stepN}].json.statusCode }}`, label: "statusCode", sampleValue: "200" },
        { expression: `{{ $steps[${stepN}].json.body }}`, label: "body", sampleValue: "{ ... }" },
      ],
    })
  })

  // Loop context variables if inside a loop
  const isInLoop = nodes.some(
    (n) => n.type === "loop" && n.bodyNodeIds?.includes(currentNodeId)
  )
  if (isInLoop) {
    groups.push({
      nodeLabel: "Loop context",
      stepNumber: "loop",
      variables: [
        { expression: "{{ $item }}", label: "Current item", sampleValue: "{ ... }" },
        { expression: "{{ $index }}", label: "Current index", sampleValue: "0" },
      ],
    })
  }

  // Utility
  groups.push({
    nodeLabel: "Utilities",
    stepNumber: "util",
    variables: [
      { expression: "{{ $now }}", label: "Current timestamp", sampleValue: new Date().toISOString() },
    ],
  })

  return groups
}

interface Props {
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
  onInsert: (expression: string) => void
}

export function VariablePicker({ nodes, nodeOrder, currentNodeId, onInsert }: Props) {
  const [open, setOpen] = useState(false)
  const groups = buildVariableGroups(nodes, nodeOrder, currentNodeId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary px-2">
          <Variable size={11} />
          Insert variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-semibold text-slate-600">Available variables</p>
        </div>
        <ScrollArea className="h-64">
          {groups.map((group) => (
            <div key={group.stepNumber}>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-t first:border-t-0">
                <p className="text-xs font-semibold text-slate-500">{group.nodeLabel}</p>
              </div>
              {group.variables.map((v) => (
                <button
                  key={v.expression}
                  onClick={() => { onInsert(v.expression); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-800">{v.label}</p>
                    <p className="text-xs text-slate-400 font-mono">{v.expression}</p>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-20">{v.sampleValue}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No variables available from previous steps
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
