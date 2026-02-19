// src/components/workflow/BranchContainer.tsx
import { CheckCircle2, XCircle } from "lucide-react"
import type { WorkflowNode } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"

interface BranchProps {
  label: "true" | "false"
  nodeIds: string[]
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  parentNodeId: string
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "true" | "false") => void
  getStepNumber: (nodeId: string) => string
}

function Branch({
  label,
  nodeIds,
  allNodes,
  selectedNodeId,
  parentNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: BranchProps) {
  const nodes = nodeIds.map((id) => allNodes.find((n) => n.id === id)).filter(Boolean) as WorkflowNode[]
  const isTrue = label === "true"

  return (
    <div className="flex-1 min-w-0">
      {/* Branch label */}
      <div className={`flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-lg w-fit text-xs font-semibold ${
        isTrue
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}>
        {isTrue
          ? <CheckCircle2 size={12} />
          : <XCircle size={12} />
        }
        <span>{isTrue ? "True" : "False"}</span>
      </div>

      {/* Nodes */}
      <div className="flex flex-col gap-0">
        {nodes.map((node) => (
          <div key={node.id}>
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
            <AddButton
              onClick={() => onAddClick(node.id, parentNodeId, label)}
            />
          </div>
        ))}
        {nodes.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center mb-1">
            <p className="text-xs text-slate-400">No steps in this branch</p>
          </div>
        )}
        <AddButton
          onClick={() =>
            onAddClick(nodes[nodes.length - 1]?.id ?? null, parentNodeId, label)
          }
          label="Add to branch"
        />
      </div>
    </div>
  )
}

interface Props {
  ifNode: WorkflowNode
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "true" | "false") => void
  getStepNumber: (nodeId: string) => string
}

export function BranchContainer({
  ifNode,
  allNodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: Props) {
  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex gap-4">
        <Branch
          label="true"
          nodeIds={ifNode.trueBranchNodeIds ?? []}
          allNodes={allNodes}
          selectedNodeId={selectedNodeId}
          parentNodeId={ifNode.id}
          onNodeClick={onNodeClick}
          onNodeDelete={onNodeDelete}
          onAddClick={onAddClick}
          getStepNumber={getStepNumber}
        />
        <div className="w-px bg-slate-200 flex-shrink-0" />
        <Branch
          label="false"
          nodeIds={ifNode.falseBranchNodeIds ?? []}
          allNodes={allNodes}
          selectedNodeId={selectedNodeId}
          parentNodeId={ifNode.id}
          onNodeClick={onNodeClick}
          onNodeDelete={onNodeDelete}
          onAddClick={onAddClick}
          getStepNumber={getStepNumber}
        />
      </div>
    </div>
  )
}
