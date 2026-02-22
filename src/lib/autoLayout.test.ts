// src/lib/autoLayout.test.ts
import { describe, it, expect } from 'vitest'
import { autoLayout } from './autoLayout'
import type { WorkflowNode, WorkflowEdge } from '@/types'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request'): WorkflowNode {
  return {
    id,
    type,
    label: id,
    category: type.includes('trigger') ? 'trigger' : 'action',
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 0, y: 0 },
  }
}

describe('autoLayout', () => {
  it('positions a linear 3-node workflow left-to-right', () => {
    const nodes = [makeNode('a', 'schedule_trigger'), makeNode('b'), makeNode('c')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const result = autoLayout(nodes, edges)
    // Each subsequent node should be further right (larger x)
    expect(result[0].position.x).toBeLessThan(result[1].position.x)
    expect(result[1].position.x).toBeLessThan(result[2].position.x)
    // All on same y (no branching)
    expect(result[0].position.y).toBe(result[1].position.y)
  })

  it('positions IF true branch above false branch', () => {
    const nodes = [makeNode('trigger', 'manual_trigger'), makeNode('if', 'if_condition'), makeNode('trueN'), makeNode('falseN'), makeNode('merge', 'merge')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'if' },
      { id: 'e2', source: 'if', target: 'trueN', sourceHandle: 'true', type: 'branch', label: 'True' },
      { id: 'e3', source: 'if', target: 'falseN', sourceHandle: 'false', type: 'branch', label: 'False' },
      { id: 'e4', source: 'trueN', target: 'merge' },
      { id: 'e5', source: 'falseN', target: 'merge' },
    ]
    const result = autoLayout(nodes, edges)
    const trueNode = result.find(n => n.id === 'trueN')!
    const falseNode = result.find(n => n.id === 'falseN')!
    // True branch should be above (smaller y) or equal, false below (larger y)
    expect(trueNode.position.y).toBeLessThan(falseNode.position.y)
  })

  it('positions Loop Complete branch above loop node, Loop Body branch below', () => {
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('loop', 'loop'),
      makeNode('complete'),
      makeNode('body'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'loop' },
      {
        id: 'e2',
        source: 'loop',
        target: 'complete',
        sourceHandle: 'loopComplete',
        type: 'loop',
      },
      {
        id: 'e3',
        source: 'loop',
        target: 'body',
        sourceHandle: 'loopBody',
        type: 'loop',
      },
    ]
    const result = autoLayout(nodes, edges)
    const loopNode = result.find((n) => n.id === 'loop')!
    const completeNode = result.find((n) => n.id === 'complete')!
    const bodyNode = result.find((n) => n.id === 'body')!

    // Loop Complete should be ABOVE the loop node center (smaller y)
    expect(completeNode.position.y).toBeLessThan(loopNode.position.y + 40) // 40 = NODE_HEIGHT/2
    // Loop Body should be BELOW the loop node center (larger y)
    expect(bodyNode.position.y).toBeGreaterThan(loopNode.position.y - 40)
    // Complete is above Body
    expect(completeNode.position.y).toBeLessThan(bodyNode.position.y)
  })

  it('loop branch order is stable even when loopBody edge is stored before loopComplete', () => {
    // Simulates the user connecting loopBody first, loopComplete second
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('loop', 'loop'),
      makeNode('complete'),
      makeNode('body'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'loop' },
      // Note: loopBody edge comes FIRST in storage order
      { id: 'e3', source: 'loop', target: 'body', sourceHandle: 'loopBody', type: 'loop' },
      { id: 'e2', source: 'loop', target: 'complete', sourceHandle: 'loopComplete', type: 'loop' },
    ]
    const result = autoLayout(nodes, edges)
    const completeNode = result.find((n) => n.id === 'complete')!
    const bodyNode = result.find((n) => n.id === 'body')!

    // Regardless of edge insertion order, complete must always be above body
    expect(completeNode.position.y).toBeLessThan(bodyNode.position.y)
  })

  it('loopComplete stays above loopBody when loopComplete has more nodes than loopBody', () => {
    // Reproduces the bug: 1 node in loopBody, 2 nodes in loopComplete → positions flip
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('loop', 'loop'),
      makeNode('complete1'),
      makeNode('complete2'),
      makeNode('body1'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'loop' },
      { id: 'e2', source: 'loop', target: 'complete1', sourceHandle: 'loopComplete', type: 'loop' },
      { id: 'e3', source: 'complete1', target: 'complete2' },
      { id: 'e4', source: 'loop', target: 'body1', sourceHandle: 'loopBody', type: 'loop' },
    ]
    const result = autoLayout(nodes, edges)
    const complete1 = result.find(n => n.id === 'complete1')!
    const body1 = result.find(n => n.id === 'body1')!

    // loopComplete chain must ALWAYS be above (smaller y) than loopBody
    expect(complete1.position.y).toBeLessThan(body1.position.y)
  })

  it('loopComplete stays above loopBody when loopBody has more nodes than loopComplete', () => {
    // Inverse asymmetry case — body is longer, complete is shorter
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('loop', 'loop'),
      makeNode('complete1'),
      makeNode('body1'),
      makeNode('body2'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'loop' },
      { id: 'e2', source: 'loop', target: 'complete1', sourceHandle: 'loopComplete', type: 'loop' },
      { id: 'e3', source: 'loop', target: 'body1', sourceHandle: 'loopBody', type: 'loop' },
      { id: 'e4', source: 'body1', target: 'body2' },
    ]
    const result = autoLayout(nodes, edges)
    const complete1 = result.find(n => n.id === 'complete1')!
    const body1 = result.find(n => n.id === 'body1')!

    expect(complete1.position.y).toBeLessThan(body1.position.y)
  })

  it('loopComplete stays above loopBody when body node was added before complete node', () => {
    // Realistic: user connected loopBody first, then loopComplete.
    // body1 appears BEFORE c1/c2 in nodes[] — this seeds dagre's internal node
    // ordering before the edge-sort can influence it, triggering the position-flip.
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('loop', 'loop'),
      makeNode('body1'),    // stored before complete nodes (added first by user)
      makeNode('complete1'),
      makeNode('complete2'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'loop' },
      { id: 'e2', source: 'loop', target: 'body1', sourceHandle: 'loopBody', type: 'loop' },  // stored first
      { id: 'e3', source: 'loop', target: 'complete1', sourceHandle: 'loopComplete', type: 'loop' }, // stored second
      { id: 'e4', source: 'complete1', target: 'complete2' },
    ]
    const result = autoLayout(nodes, edges)
    const complete1 = result.find(n => n.id === 'complete1')!
    const body1 = result.find(n => n.id === 'body1')!

    // loopComplete (complete1) must ALWAYS be above (smaller y) than loopBody (body1)
    expect(complete1.position.y).toBeLessThan(body1.position.y)
  })

  it('loopComplete stays above loopBody in a large graph with prefix nodes before the loop', () => {
    // Large-graph scenario from the bug report: a linear prefix chain feeds an IF node,
    // which routes to a loop. loopBody has 1 node, loopComplete has 2 nodes.
    // This combination triggers dagre's position-flip even after the edge sort.
    const nodes = [
      makeNode('trigger', 'manual_trigger'),
      makeNode('a1'), makeNode('a2'), makeNode('a3'), makeNode('a4'),
      makeNode('if', 'if_condition'),
      makeNode('loop', 'loop'),
      makeNode('telegram'),   // loopBody
      makeNode('sheets1'),    // loopComplete first
      makeNode('sheets2'),    // loopComplete second
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'a1' },
      { id: 'e2', source: 'a1', target: 'a2' },
      { id: 'e3', source: 'a2', target: 'a3' },
      { id: 'e4', source: 'a3', target: 'a4' },
      { id: 'e5', source: 'a4', target: 'if' },
      { id: 'e6', source: 'if', target: 'loop', sourceHandle: 'true', type: 'branch', label: 'True' },
      { id: 'e7', source: 'loop', target: 'telegram', sourceHandle: 'loopBody', type: 'loop' },
      { id: 'e8', source: 'loop', target: 'sheets1', sourceHandle: 'loopComplete', type: 'loop' },
      { id: 'e9', source: 'sheets1', target: 'sheets2' },
    ]
    const result = autoLayout(nodes, edges)
    const sheets1 = result.find(n => n.id === 'sheets1')!
    const telegram = result.find(n => n.id === 'telegram')!

    // loopComplete (sheets1) must be above (smaller y) loopBody (telegram)
    expect(sheets1.position.y).toBeLessThan(telegram.position.y)
  })

  it('returns same number of nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges: WorkflowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = autoLayout(nodes, edges)
    expect(result).toHaveLength(2)
  })

  it('handles empty graph', () => {
    const result = autoLayout([], [])
    expect(result).toEqual([])
  })
})
