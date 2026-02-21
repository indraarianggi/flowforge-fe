// src/components/workflow/edges/BranchEdge.tsx
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus, X } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

function BranchEdgeComponent({
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
  label,
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

  // Determine visual treatment based on source handle
  const isTrueBranch = sourceHandleId === 'true'
  const isFalseBranch = sourceHandleId === 'false'
  const isLoopBody = sourceHandleId === 'loopBody'

  const edgeColor = isTrueBranch
    ? '#22c55e'
    : isFalseBranch
    ? '#94a3b8'
    : '#3b82f6'

  const strokeDasharray = isLoopBody ? '8 4' : undefined

  const labelBg = isTrueBranch
    ? '#f0fdf4'
    : isFalseBranch
    ? '#f1f5f9'
    : '#eff6ff'

  const labelText =
    label != null
      ? String(label)
      : isTrueBranch
      ? 'True'
      : isFalseBranch
      ? 'False'
      : 'Loop'

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
          stroke: selected ? '#6366f1' : edgeColor,
          strokeDasharray,
        }}
      />
      <EdgeLabelRenderer>
        {/* Branch label — floated just past the source handle; False sits below the line */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, ${isFalseBranch ? '20%' : '-120%'}) translate(${sourceX + 30}px,${sourceY}px)`,
            pointerEvents: 'none',
          }}
        >
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ color: edgeColor, backgroundColor: labelBg }}
          >
            {labelText}
          </span>
        </div>

        {/* + button at midpoint */}
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
            className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            style={{ borderColor: edgeColor }}
            aria-label={`Add step on ${labelText} branch`}
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

export const BranchEdge = memo(BranchEdgeComponent)
