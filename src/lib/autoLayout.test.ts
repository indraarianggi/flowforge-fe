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
