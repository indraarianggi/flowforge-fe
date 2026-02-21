// src/stores/editorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './editorStore'
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types'

function makeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Workflow {
  return {
    id: 'wf-test',
    userId: 'user-1',
    name: 'Test Workflow',
    isActive: false,
    nodes,
    edges,
    settings: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return {
    id,
    type,
    label: `Node ${id}`,
    category,
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 0, y: 0 },
  }
}

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      workflow: null,
      rfNodes: [],
      rfEdges: [],
      selectedNodeId: null,
      isPanelOpen: false,
      isPickerOpen: false,
      pickerContext: null,
    })
  })

  describe('loadWorkflow', () => {
    it('sets workflow and generates RF nodes/edges', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)

      const state = useEditorStore.getState()
      expect(state.workflow).toBeDefined()
      expect(state.rfNodes).toHaveLength(2)
      expect(state.rfEdges).toHaveLength(1)
      // Nodes should have been auto-laid-out: second node must be to the right of first
      expect(state.rfNodes[1].position.x).toBeGreaterThan(state.rfNodes[0].position.x)
    })
  })

  describe('addNode', () => {
    it('adds a node between two existing nodes by splitting an edge', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)

      const newNode = makeNode('c')
      useEditorStore.getState().addNode(newNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(3)
      expect(state.workflow!.edges).toHaveLength(2)
      // Edge from a→b should be replaced by a→c and c→b
      const edgeSources = state.workflow!.edges.map(e => `${e.source}->${e.target}`)
      expect(edgeSources).toContain('a->c')
      expect(edgeSources).toContain('c->b')
    })

    it('adds a node at the end (no target)', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger')],
        []
      )
      useEditorStore.getState().loadWorkflow(wf)

      const newNode = makeNode('b')
      useEditorStore.getState().addNode(newNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
      })

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(2)
      expect(state.workflow!.edges).toHaveLength(1)
      expect(state.workflow!.edges[0].source).toBe('a')
      expect(state.workflow!.edges[0].target).toBe('b')
    })
  })

  describe('deleteNode', () => {
    it('removes a node and reconnects surrounding edges', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b'), makeNode('c')],
        [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
        ]
      )
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().deleteNode('b')

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(2)
      expect(state.workflow!.edges).toHaveLength(1)
      expect(state.workflow!.edges[0].source).toBe('a')
      expect(state.workflow!.edges[0].target).toBe('c')
    })

    it('removes a terminal node and its incoming edge', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().deleteNode('b')

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(1)
      expect(state.workflow!.edges).toHaveLength(0)
    })
  })

  describe('selectNode', () => {
    it('sets selectedNodeId and opens panel', () => {
      const wf = makeWorkflow([makeNode('a')], [])
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().selectNode('a')

      const state = useEditorStore.getState()
      expect(state.selectedNodeId).toBe('a')
      expect(state.isPanelOpen).toBe(true)
    })
  })

  describe('openPicker / closePicker', () => {
    it('sets picker context and clears it', () => {
      useEditorStore.getState().openPicker({
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })
      expect(useEditorStore.getState().isPickerOpen).toBe(true)
      expect(useEditorStore.getState().pickerContext).toEqual({
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })

      useEditorStore.getState().closePicker()
      expect(useEditorStore.getState().isPickerOpen).toBe(false)
      expect(useEditorStore.getState().pickerContext).toBeNull()
    })
  })

})
