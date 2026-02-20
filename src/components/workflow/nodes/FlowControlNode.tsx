// src/components/workflow/nodes/FlowControlNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'
import { useEditorStore } from '@/stores/editorStore'

function FlowControlNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber, isTerminalNode } = data as FlowNodeData
  const nodeType = workflowNode.type
  const openPicker = useEditorStore((s) => s.openPicker)

  // Only single-output flow control nodes (wait, merge) get the terminal add button.
  // if_condition and loop are always auto-scaffolded with outgoing edges.
  const hasSingleOutput = nodeType === 'wait' || nodeType === 'merge'

  function handleAddAfter(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: 'main' })
  }

  return (
    <>
      {/* Input handles */}
      {nodeType === 'merge' ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="branchA"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="branchB"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: '70%' }}
          />
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}

      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
      />

      {/* Output handles */}
      {nodeType === 'if_condition' && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
            style={{ top: '70%' }}
          />
        </>
      )}

      {nodeType === 'loop' && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="loopBody"
            className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="loopComplete"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
          />
        </>
      )}

      {(nodeType === 'wait' || nodeType === 'merge') && (
        <Handle
          type="source"
          position={Position.Right}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}

      {hasSingleOutput && isTerminalNode && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: '50%',
            left: 'calc(100% + 14px)',
            transform: 'translateY(-50%)',
            pointerEvents: 'all',
          }}
        >
          <button
            onClick={handleAddAfter}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            aria-label="Add step"
          >
            <Plus size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
          </button>
        </div>
      )}
    </>
  )
}

export const FlowControlNode = memo(FlowControlNodeComponent)
