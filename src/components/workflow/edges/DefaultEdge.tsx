// src/components/workflow/edges/DefaultEdge.tsx
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus, X } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

function DefaultEdgeComponent({
  id,
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
  selected,
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
  const deleteEdge = useEditorStore((s) => s.deleteEdge)

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({
      sourceNodeId: source,
      sourceHandle: sourceHandleId ?? 'main',
      targetNodeId: target,
    })
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    deleteEdge(id)
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: selected ? '#6366f1' : '#cbd5e1',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            aria-label="Add step"
          >
            <Plus size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
          </button>
          {selected && (
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-full bg-white border-2 border-red-200 flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all duration-150 shadow-sm hover:shadow group"
              aria-label="Delete connection"
            >
              <X size={12} className="text-red-300 group-hover:text-red-500 transition-colors duration-150" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const DefaultEdge = memo(DefaultEdgeComponent)
