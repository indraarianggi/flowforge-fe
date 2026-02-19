// src/components/workflow/WorkflowCanvas.tsx
import { Workflow } from "lucide-react"
import type { WorkflowNode } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"
import { BranchContainer } from "./BranchContainer"
import { LoopContainer } from "./LoopContainer"

interface Props {
  nodeOrder: string[]
  nodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId?: string | null, branchType?: "true" | "false" | "body" | null) => void
}

export function WorkflowCanvas({
  nodeOrder,
  nodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
}: Props) {
  const topLevelNodes = nodeOrder
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as WorkflowNode[]

  // Step numbering: top-level nodes get 1, 2, 3...
  // Branch nodes get 3a.1, 3a.2 / 3b.1, 3b.2
  // Loop body nodes get 3.1, 3.2
  function getStepNumber(nodeId: string): string {
    const topIdx = nodeOrder.indexOf(nodeId)
    if (topIdx !== -1) return String(topIdx + 1)

    for (const node of nodes) {
      const trueIdx = node.trueBranchNodeIds?.indexOf(nodeId) ?? -1
      if (trueIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}a.${trueIdx + 1}`
      }
      const falseIdx = node.falseBranchNodeIds?.indexOf(nodeId) ?? -1
      if (falseIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}b.${falseIdx + 1}`
      }
      const bodyIdx = node.bodyNodeIds?.indexOf(nodeId) ?? -1
      if (bodyIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}.${bodyIdx + 1}`
      }
    }
    return "?"
  }

  if (topLevelNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Workflow size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No steps yet</p>
            <p className="text-xs text-slate-400">Add a trigger to start building your workflow</p>
          </div>
          <AddButton onClick={() => onAddClick(null)} label="Add trigger" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0 w-full max-w-2xl mx-auto py-8 px-4">
      <AddButton onClick={() => onAddClick(null)} label="Add trigger" />
      {topLevelNodes.map((node) => (
        <div key={node.id} className="w-full flex flex-col items-center gap-0">
          <div className="w-full">
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
          </div>

          {/* IF node: render branch container */}
          {node.type === "if_condition" && (
            <div className="w-full mt-2 mb-1">
              <BranchContainer
                ifNode={node}
                allNodes={nodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={onNodeClick}
                onNodeDelete={onNodeDelete}
                onAddClick={(after, parent, branch) => onAddClick(after, parent, branch)}
                getStepNumber={getStepNumber}
              />
            </div>
          )}

          {/* Loop node: render loop container */}
          {node.type === "loop" && (
            <div className="w-full mt-2 mb-1">
              <LoopContainer
                loopNode={node}
                allNodes={nodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={onNodeClick}
                onNodeDelete={onNodeDelete}
                onAddClick={(after, parent, branch) => onAddClick(after, parent, branch)}
                getStepNumber={getStepNumber}
              />
            </div>
          )}

          <AddButton
            onClick={() => onAddClick(node.id)}
          />
        </div>
      ))}
    </div>
  )
}
