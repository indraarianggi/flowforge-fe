// src/components/workflow/LoopContainer.tsx
import { RefreshCw } from "lucide-react"
import type { WorkflowNode, LoopConfig } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"

interface Props {
  loopNode: WorkflowNode
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "body") => void
  getStepNumber: (nodeId: string) => string
}

export function LoopContainer({
  loopNode,
  allNodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: Props) {
  const config = loopNode.config as LoopConfig
  const bodyNodes = (loopNode.bodyNodeIds ?? [])
    .map((id) => allNodes.find((n) => n.id === id))
    .filter(Boolean) as WorkflowNode[]

  const summaryText =
    config.mode === "forEach"
      ? `For each item in ${config.source || "…"}`
      : `Repeat ${config.count || "N"} times`

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100/70 border-b border-blue-200">
        <RefreshCw size={12} className="text-blue-500 animate-none" />
        <span className="text-xs font-semibold text-blue-700">{summaryText}</span>
      </div>

      {/* Body nodes */}
      <div className="p-4 flex flex-col gap-0">
        {bodyNodes.map((node) => (
          <div key={node.id}>
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
            <AddButton
              onClick={() => onAddClick(node.id, loopNode.id, "body")}
            />
          </div>
        ))}
        {bodyNodes.length === 0 && (
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center mb-2">
            <p className="text-xs text-blue-400">No steps in loop body</p>
          </div>
        )}
        <AddButton
          onClick={() =>
            onAddClick(bodyNodes[bodyNodes.length - 1]?.id ?? null, loopNode.id, "body")
          }
          label="Add to loop"
        />
      </div>
    </div>
  )
}
