// src/components/workflow/edges/DefaultEdge.tsx
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

function DefaultEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  source,
  target,
  sourceHandleId,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const openPicker = useEditorStore((s) => s.openPicker)

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({
      sourceNodeId: source,
      sourceHandle: sourceHandleId ?? 'main',
      targetNodeId: target,
    })
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: '#cbd5e1',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            aria-label="Add step"
          >
            <Plus
              size={12}
              className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const DefaultEdge = memo(DefaultEdgeComponent)
