import { describe, it, expect } from 'vitest'
import { seedWorkflows } from './workflows'

describe('seedWorkflows', () => {
  it('should have 3 workflows', () => {
    expect(seedWorkflows).toHaveLength(3)
  })

  it('all workflows should have edges array (not nodeOrder)', () => {
    for (const wf of seedWorkflows) {
      expect(wf).toHaveProperty('edges')
      expect(Array.isArray(wf.edges)).toBe(true)
      expect('nodeOrder' in wf).toBe(false)
    }
  })

  it('all nodes should have position field', () => {
    for (const wf of seedWorkflows) {
      for (const node of wf.nodes) {
        expect(node).toHaveProperty('position')
        expect(typeof node.position.x).toBe('number')
        expect(typeof node.position.y).toBe('number')
      }
    }
  })

  it('no nodes should have trueBranchNodeIds, falseBranchNodeIds, or bodyNodeIds', () => {
    for (const wf of seedWorkflows) {
      for (const node of wf.nodes) {
        expect('trueBranchNodeIds' in node).toBe(false)
        expect('falseBranchNodeIds' in node).toBe(false)
        expect('bodyNodeIds' in node).toBe(false)
      }
    }
  })

  it('wf-001 (linear) has 2 edges connecting 3 nodes', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-001')!
    expect(wf.nodes).toHaveLength(3)
    expect(wf.edges).toHaveLength(2)
  })

  it('wf-002 (IF branch) has branch edges with sourceHandle true/false', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-002')!
    const trueEdge = wf.edges.find(e => e.sourceHandle === 'true')
    const falseEdge = wf.edges.find(e => e.sourceHandle === 'false')
    expect(trueEdge).toBeDefined()
    expect(falseEdge).toBeDefined()
    expect(trueEdge!.type).toBe('branch')
    expect(falseEdge!.type).toBe('branch')
  })

  it('wf-003 (loop) has loopBody edge', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-003')!
    const loopEdge = wf.edges.find(e => e.sourceHandle === 'loopBody')
    expect(loopEdge).toBeDefined()
    expect(loopEdge!.type).toBe('loop')
  })
})
