// src/lib/autoLayout.ts
import dagre from 'dagre'
import type { WorkflowNode, WorkflowEdge } from '@/types'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

export function autoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options?: { rankdir?: string; nodesep?: number; ranksep?: number }
): WorkflowNode[] {
  if (nodes.length === 0) return []

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))

  const rankdir = options?.rankdir ?? 'LR'
  const nodesep = options?.nodesep ?? 80
  const ranksep = options?.ranksep ?? 250

  g.setGraph({ rankdir, nodesep, ranksep })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        // dagre returns center coords; React Flow uses top-left
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
