// src/components/workflow/nodes/TriggerNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'
import { useEditorStore } from '@/stores/editorStore'

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber, isTerminalNode } = data as FlowNodeData
  const openPicker = useEditorStore((s) => s.openPicker)

  function handleAddAfter(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: 'main' })
  }

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
      {isTerminalNode && (
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

export const TriggerNode = memo(TriggerNodeComponent)
