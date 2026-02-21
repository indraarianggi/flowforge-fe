// src/components/workflow/edges/LoopBackEdge.tsx
import { memo } from 'react'
import type { EdgeProps } from '@xyflow/react'

const LOOP_COLOR = '#3b82f6'
const DROP = 80     // px below the lower node before turning back left
const OFFSET = 16   // px to extend horizontally before the first turn
const RADIUS = 12   // corner rounding radius

function LoopBackEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  // sourceX > targetX in LR layout (body nodes sit right of the loop node).
  // Step path: exit right → drop → sweep left past loop → rise → enter left.
  // Each 90° corner is replaced by a Q (quadratic bezier) for smooth rounding.
  const bottom = Math.max(sourceY, targetY) + DROP
  const sx = sourceX, sy = sourceY
  const tx = targetX, ty = targetY
  const off = OFFSET, r = RADIUS

  const path = [
    `M ${sx} ${sy}`,
    // exit right, then corner 1: right→down
    `L ${sx + off - r} ${sy}`,
    `Q ${sx + off} ${sy} ${sx + off} ${sy + r}`,
    // drop down, then corner 2: down→left
    `L ${sx + off} ${bottom - r}`,
    `Q ${sx + off} ${bottom} ${sx + off - r} ${bottom}`,
    // sweep left, then corner 3: left→up
    `L ${tx - off + r} ${bottom}`,
    `Q ${tx - off} ${bottom} ${tx - off} ${bottom - r}`,
    // rise up, then corner 4: up→right
    `L ${tx - off} ${ty + r}`,
    `Q ${tx - off} ${ty} ${tx - off + r} ${ty}`,
    // enter left into loop node
    `L ${tx} ${ty}`,
  ].join(' ')

  return (
    <path
      d={path}
      fill="none"
      stroke={LOOP_COLOR}
      strokeWidth={2}
      strokeDasharray="8 4"
      strokeLinecap="round"
      opacity={0.65}
    />
  )
}

export const LoopBackEdge = memo(LoopBackEdgeComponent)
