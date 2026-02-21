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

  // Sort branch edges so 'true' always precedes 'false' for the same source node.
  // Dagre uses edge-addition order to seed its crossing-minimisation heuristic,
  // so this guarantees the true branch is always placed above the false branch
  // regardless of the order the user connected the nodes.
  const sortedEdges = [...edges].sort((a, b) => {
    if (a.source !== b.source) return 0
    const rank = (h: string | undefined) => (h === 'true' ? 0 : h === 'false' ? 1 : 2)
    return rank(a.sourceHandle) - rank(b.sourceHandle)
  })

  sortedEdges.forEach((edge) => {
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
