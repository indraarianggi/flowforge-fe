// src/components/workflow/nodes/FlowControlNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function FlowControlNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData
  const nodeType = workflowNode.type

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
    </>
  )
}

export const FlowControlNode = memo(FlowControlNodeComponent)
