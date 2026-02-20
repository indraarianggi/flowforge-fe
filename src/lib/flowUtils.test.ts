// src/lib/flowUtils.test.ts
import { describe, it, expect } from 'vitest'
import { toRFNodes, toRFEdges, fromRFNodes, getStepNumbers } from './flowUtils'
import type { WorkflowNode, WorkflowEdge } from '@/types'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return {
    id,
    type,
    label: `Node ${id}`,
    category,
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 100, y: 200 },
  }
}

describe('toRFNodes', () => {
  it('converts WorkflowNodes to React Flow nodes with correct structure', () => {
    const nodes = [makeNode('n-1', 'schedule_trigger', 'trigger')]
    const stepNumbers = new Map([['n-1', '1']])
    const rfNodes = toRFNodes(nodes, stepNumbers)

    expect(rfNodes).toHaveLength(1)
    expect(rfNodes[0].id).toBe('n-1')
    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[0].position).toEqual({ x: 100, y: 200 })
    expect(rfNodes[0].data.workflowNode.id).toBe('n-1')
    expect(rfNodes[0].data.stepNumber).toBe('1')
  })

  it('maps node category to React Flow node type', () => {
    const nodes = [
      makeNode('t', 'schedule_trigger', 'trigger'),
      makeNode('a', 'http_request', 'action'),
      makeNode('f', 'if_condition', 'flow_control'),
      makeNode('i', 'telegram_send_message', 'integration'),
    ]
    const stepNumbers = new Map([['t', '1'], ['a', '2'], ['f', '3'], ['i', '4']])
    const rfNodes = toRFNodes(nodes, stepNumbers)

    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[1].type).toBe('action')
    expect(rfNodes[2].type).toBe('flowControl')
    expect(rfNodes[3].type).toBe('action') // integrations use action node type
  })
})

describe('toRFEdges', () => {
  it('converts WorkflowEdges to React Flow edges', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e-1', source: 'n-1', target: 'n-2' },
    ]
    const rfEdges = toRFEdges(edges)

    expect(rfEdges).toHaveLength(1)
    expect(rfEdges[0].id).toBe('e-1')
    expect(rfEdges[0].source).toBe('n-1')
    expect(rfEdges[0].target).toBe('n-2')
    expect(rfEdges[0].type).toBe('default')
  })

  it('maps branch edges to branch type', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e-1', source: 'n-1', target: 'n-2', sourceHandle: 'true', type: 'branch', label: 'True' },
    ]
    const rfEdges = toRFEdges(edges)

    expect(rfEdges[0].type).toBe('branch')
    expect(rfEdges[0].label).toBe('True')
    expect(rfEdges[0].sourceHandle).toBe('true')
  })
})

describe('fromRFNodes', () => {
  it('extracts positions from React Flow nodes back into WorkflowNodes', () => {
    const originalNodes = [makeNode('n-1')]
    const rfNodes = [{ id: 'n-1', position: { x: 300, y: 400 }, data: {}, type: 'action' }]

    const result = fromRFNodes(originalNodes, rfNodes as any)
    expect(result[0].position).toEqual({ x: 300, y: 400 })
    expect(result[0].id).toBe('n-1')
  })
})

describe('getStepNumbers', () => {
  it('computes topological step numbers for linear flow', () => {
    const nodes: WorkflowNode[] = [
      makeNode('a', 'schedule_trigger', 'trigger'),
      makeNode('b'),
      makeNode('c'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const steps = getStepNumbers(nodes, edges)

    expect(steps.get('a')).toBe('1')
    expect(steps.get('b')).toBe('2')
    expect(steps.get('c')).toBe('3')
  })

  it('labels branch nodes with a/b suffix', () => {
    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'manual_trigger', 'trigger'),
      makeNode('if', 'if_condition', 'flow_control'),
      makeNode('trueN'),
      makeNode('falseN'),
      makeNode('merge', 'merge', 'flow_control'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'if' },
      { id: 'e2', source: 'if', target: 'trueN', sourceHandle: 'true', type: 'branch' },
      { id: 'e3', source: 'if', target: 'falseN', sourceHandle: 'false', type: 'branch' },
      { id: 'e4', source: 'trueN', target: 'merge' },
      { id: 'e5', source: 'falseN', target: 'merge' },
    ]
    const steps = getStepNumbers(nodes, edges)

    expect(steps.get('trigger')).toBe('1')
    expect(steps.get('if')).toBe('2')
    expect(steps.get('trueN')).toBe('2a')
    expect(steps.get('falseN')).toBe('2b')
    expect(steps.get('merge')).toBe('3')
  })
})
