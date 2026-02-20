// src/components/workflow/nodes/ActionNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function ActionNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="main"
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
        onDelete={() => {}}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="main"
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </>
  )
}

export const ActionNode = memo(ActionNodeComponent)
