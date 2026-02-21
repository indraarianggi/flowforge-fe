import { describe, it, expect } from 'vitest'
import type { WorkflowNode, WorkflowEdge } from '@/types'

// Test the buildVariableGroups logic extracted as a utility
import { buildVariableGroups } from './VariablePicker'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return { id, type, label: `Node ${id}`, category, status: 'configured', config: {} as any, position: { x: 0, y: 0 } }
}

describe('buildVariableGroups (edge-based)', () => {
  it('includes trigger variables', () => {
    const nodes = [makeNode('t', 'schedule_trigger', 'trigger'), makeNode('a')]
    const edges: WorkflowEdge[] = [{ id: 'e1', source: 't', target: 'a' }]
    const groups = buildVariableGroups(nodes, edges, 'a')
    expect(groups[0].stepNumber).toBe('trigger')
  })

  it('includes previous step variables by walking edges backwards', () => {
    const nodes = [makeNode('t', 'schedule_trigger', 'trigger'), makeNode('a'), makeNode('b')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 't', target: 'a' },
      { id: 'e2', source: 'a', target: 'b' },
    ]
    const groups = buildVariableGroups(nodes, edges, 'b')
    // Should have trigger + step 2 (node a) + utilities
    const stepNumbers = groups.map(g => g.stepNumber)
    expect(stepNumbers).toContain('trigger')
    expect(stepNumbers).toContain('2')
  })

  it('includes loop context for nodes inside a loop', () => {
    const nodes = [
      makeNode('t', 'manual_trigger', 'trigger'),
      makeNode('loop', 'loop', 'flow_control'),
      { ...makeNode('body'), parentId: 'loop', branchType: 'body' as const },
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 't', target: 'loop' },
      { id: 'e2', source: 'loop', target: 'body', sourceHandle: 'loopBody', type: 'loop' },
    ]
    const groups = buildVariableGroups(nodes, edges, 'body')
    const hasLoop = groups.some(g => g.stepNumber === 'loop')
    expect(hasLoop).toBe(true)
  })
})
