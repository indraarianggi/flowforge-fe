// src/lib/flowUtils.ts
import type { Node, Edge } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '@/types'

export interface FlowNodeData {
  workflowNode: WorkflowNode
  stepNumber: string
  /** True when this node has no outgoing edges — used to render an "add after" button */
  isTerminalNode: boolean
  /** Whether the IF node's "true" handle already has an outgoing edge */
  trueBranchConnected: boolean
  /** Whether the IF node's "false" handle already has an outgoing edge */
  falseBranchConnected: boolean
  /** Whether the Loop node's "loopBody" handle already has an outgoing edge */
  loopBodyConnected: boolean
  /** Whether the Loop node's "loopComplete" handle already has an outgoing edge */
  loopCompleteConnected: boolean
  [key: string]: unknown
}

/**
 * Map node category to React Flow custom node type key
 */
function rfNodeType(node: WorkflowNode): string {
  if (node.category === 'trigger') return 'trigger'
  if (node.category === 'flow_control') return 'flowControl'
  return 'action' // action + integration both use the action node type
}

/**
 * Convert WorkflowNodes → React Flow Node[]
 */
export function toRFNodes(
  nodes: WorkflowNode[],
  stepNumbers: Map<string, string>,
  edges: WorkflowEdge[]
): Node<FlowNodeData>[] {
  const nodesWithOutgoingEdge = new Set(edges.map((e) => e.source))
  const nodesWithTrueEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'true').map((e) => e.source)
  )
  const nodesWithFalseEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'false').map((e) => e.source)
  )
  const nodesWithLoopBodyEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'loopBody').map((e) => e.source)
  )
  const nodesWithLoopCompleteEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'loopComplete').map((e) => e.source)
  )

  return nodes.map((wn) => ({
    id: wn.id,
    type: rfNodeType(wn),
    position: wn.position,
    data: {
      workflowNode: wn,
      stepNumber: stepNumbers.get(wn.id) ?? '?',
      isTerminalNode: !nodesWithOutgoingEdge.has(wn.id),
      trueBranchConnected: nodesWithTrueEdge.has(wn.id),
      falseBranchConnected: nodesWithFalseEdge.has(wn.id),
      loopBodyConnected: nodesWithLoopBodyEdge.has(wn.id),
      loopCompleteConnected: nodesWithLoopCompleteEdge.has(wn.id),
    },
  }))
}

/**
 * Find the terminal node in a loop body chain starting from a given nodeId.
 * Follows edges with no sourceHandle (main flow) until no outgoing edge found.
 */
function findLoopBodyTerminal(startId: string, edges: WorkflowEdge[]): string {
  let current = startId
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = edges.find(
      (e) =>
        e.source === current && (!e.sourceHandle || e.sourceHandle === 'main'),
    )
    if (!next) return current
    current = next.target
  }
}

/**
 * Convert WorkflowEdges → React Flow Edge[]
 * Optionally pass nodes to inject synthetic loopBack edges (derived — not stored in workflow data).
 */
export function toRFEdges(
  edges: WorkflowEdge[],
  nodes: WorkflowNode[] = [],
): Edge[] {
  const rfEdges: Edge[] = edges.map((we) => ({
    id: we.id,
    source: we.source,
    target: we.target,
    sourceHandle: we.sourceHandle,
    targetHandle: we.targetHandle,
    type: we.type ?? 'default',
    label: we.label,
    data: { workflowEdge: we },
  }))

  // Inject synthetic loopBack edges (derived — not stored in workflow data)
  const loopNodes = nodes.filter((n) => n.type === 'loop')
  for (const loopNode of loopNodes) {
    const bodyEdge = edges.find(
      (e) => e.source === loopNode.id && e.sourceHandle === 'loopBody',
    )
    if (!bodyEdge) continue

    const terminalId = findLoopBodyTerminal(bodyEdge.target, edges)
    rfEdges.push({
      id: `loopback-${loopNode.id}`,
      source: terminalId,
      target: loopNode.id,
      type: 'loopBack',
      data: {},
    })
  }

  return rfEdges
}

/**
 * Extract updated positions from React Flow nodes back into WorkflowNodes
 */
export function fromRFNodes(
  workflowNodes: WorkflowNode[],
  rfNodes: Node[]
): WorkflowNode[] {
  const posMap = new Map(rfNodes.map((n) => [n.id, n.position]))
  return workflowNodes.map((wn) => {
    const pos = posMap.get(wn.id)
    return pos ? { ...wn, position: pos } : wn
  })
}

/**
 * Compute step numbers from topological order of a DAG.
 * Branch edges (sourceHandle 'true'/'false') produce a/b suffixed labels.
 * Loop body edges (sourceHandle 'loopBody') produce dot-suffixed labels.
 */
export function getStepNumbers(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, string> {
  const result = new Map<string, string>()
  if (nodes.length === 0) return result

  // Build adjacency and in-degree
  const adj = new Map<string, WorkflowEdge[]>()
  const inDegree = new Map<string, number>()
  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const id of nodeIds) {
    adj.set(id, [])
    inDegree.set(id, 0)
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    adj.get(edge.source)!.push(edge)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Kahn's topological sort
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  let stepCounter = 1

  while (queue.length > 0) {
    const current = queue.shift()!

    // Assign step number if not already assigned (branch nodes get assigned by parent)
    if (!result.has(current)) {
      result.set(current, String(stepCounter++))
    }

    const outEdges = adj.get(current) ?? []

    // Check if this node has branch outputs
    const trueEdges = outEdges.filter((e) => e.sourceHandle === 'true')
    const falseEdges = outEdges.filter((e) => e.sourceHandle === 'false')
    const loopBodyEdges = outEdges.filter((e) => e.sourceHandle === 'loopBody')

    const parentStep = result.get(current)!

    // Assign branch labels before processing targets
    for (const edge of trueEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}a`)
      }
    }
    for (const edge of falseEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}b`)
      }
    }

    // Assign loop body labels
    let loopBodyCounter = 1
    for (const edge of loopBodyEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}.${loopBodyCounter++}`)
      }
    }

    // Process all targets for in-degree decrement
    for (const edge of outEdges) {
      const target = edge.target
      inDegree.set(target, (inDegree.get(target) ?? 0) - 1)
      if (inDegree.get(target) === 0) {
        queue.push(target)
      }
    }
  }

  return result
}
