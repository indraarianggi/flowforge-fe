// src/components/workflow/nodes/TriggerNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData

  return (
    <>
      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="main"
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />
    </>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
