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

  // Sort branch edges so 'true'/'loopComplete' always precedes 'false'/'loopBody'
  // for the same source node. Dagre uses edge-addition order to seed its
  // crossing-minimisation heuristic, so this guarantees the correct initial order.
  const sortedEdges = [...edges].sort((a, b) => {
    if (a.source !== b.source) return 0
    const rank = (h: string | undefined) =>
      h === 'true' || h === 'loopComplete'
        ? 0
        : h === 'false' || h === 'loopBody'
          ? 1
          : 2
    return rank(a.sourceHandle) - rank(b.sourceHandle)
  })

  sortedEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  // Post-process: enforce loopComplete above loopBody for every loop node.
  // Dagre's crossing-minimisation can flip branch order when branches have
  // asymmetric depth (different node counts) or when the body node is set
  // before the complete node in the graph — regardless of the edge-sort above.
  // We detect and correct inverted ordering by shifting the entire y-coordinate
  // cluster of each branch.
  const loopNodeIds = new Set(nodes.filter(n => n.type === 'loop').map(n => n.id))

  if (loopNodeIds.size > 0) {
    // Build forward adjacency list for BFS branch-node collection.
    const adjList = new Map<string, string[]>()
    nodes.forEach(n => adjList.set(n.id, []))
    edges.forEach(edge => {
      const list = adjList.get(edge.source)
      if (list) list.push(edge.target)
    })

    // BFS: collect all node IDs reachable from startId, skipping excludeIds.
    // Excluding the loop node itself prevents re-entering it via any loop-back
    // edges and keeps each branch cluster independent.
    const collectBranchNodes = (startId: string, excludeIds: Set<string>): string[] => {
      const visited = new Set<string>()
      const queue = [startId]
      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current) || excludeIds.has(current)) continue
        visited.add(current)
        ;(adjList.get(current) ?? []).forEach(child => {
          if (!visited.has(child) && !excludeIds.has(child)) queue.push(child)
        })
      }
      return [...visited]
    }

    for (const loopId of loopNodeIds) {
      const completeEdge = edges.find(
        e => e.source === loopId && e.sourceHandle === 'loopComplete'
      )
      const bodyEdge = edges.find(
        e => e.source === loopId && e.sourceHandle === 'loopBody'
      )

      if (!completeEdge || !bodyEdge) continue

      const completeFirstPos = g.node(completeEdge.target)
      const bodyFirstPos = g.node(bodyEdge.target)

      if (!completeFirstPos || !bodyFirstPos) continue

      // In React Flow / dagre LR mode: smaller y = higher on screen = "above".
      // loopComplete must have smaller y than loopBody.
      if (completeFirstPos.y > bodyFirstPos.y) {
        // Branches are inverted — swap their y-coordinate clusters.
        const excludeIds = new Set([loopId])
        const completeChain = collectBranchNodes(completeEdge.target, excludeIds)
        const bodyChain = collectBranchNodes(bodyEdge.target, excludeIds)

        const avg = (ids: string[]) => {
          const ys = ids.map(id => g.node(id)).filter(Boolean).map(n => n.y)
          return ys.length > 0 ? ys.reduce((s, y) => s + y, 0) / ys.length : 0
        }

        const completeCenterY = avg(completeChain)
        const bodyCenterY = avg(bodyChain)
        // delta is positive: complete is erroneously below body
        const delta = completeCenterY - bodyCenterY

        // Shift complete chain up (subtract) and body chain down (add).
        // Any node appearing in both chains (shared downstream merge) gets
        // shifted −delta then +delta = net zero, so merge nodes stay in place.
        completeChain.forEach(id => { g.node(id).y -= delta })
        bodyChain.forEach(id => { g.node(id).y += delta })
      }
    }
  }

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
