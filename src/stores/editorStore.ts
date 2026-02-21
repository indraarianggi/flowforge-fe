// src/stores/editorStore.ts
import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange, Connection } from '@xyflow/react'
import type { Workflow, WorkflowEdge, WorkflowNode } from '@/types'
import { autoLayout } from '@/lib/autoLayout'
import { toRFNodes, toRFEdges, fromRFNodes, getStepNumbers } from '@/lib/flowUtils'
import type { FlowNodeData } from '@/lib/flowUtils'

export interface PickerContext {
  sourceNodeId?: string   // undefined when adding the very first node
  sourceHandle?: string
  targetNodeId?: string
}

interface EditorState {
  // Workflow data
  workflow: Workflow | null

  // React Flow state
  rfNodes: Node<FlowNodeData>[]
  rfEdges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange

  // UI state
  selectedNodeId: string | null
  isPanelOpen: boolean
  isPickerOpen: boolean
  pickerContext: PickerContext | null

  // Actions — Workflow
  loadWorkflow: (workflow: Workflow) => void
  setName: (name: string) => void

  // Actions — Node CRUD
  addNode: (node: WorkflowNode, context: PickerContext) => void
  deleteNode: (nodeId: string) => void
  updateNodeConfig: (nodeId: string, config: WorkflowNode['config']) => void
  updateNodeStatus: (nodeId: string, status: WorkflowNode['status']) => void

  // Actions — Canvas
  runAutoLayout: () => void
  selectNode: (nodeId: string) => void
  closePanel: () => void
  openPicker: (context: PickerContext) => void
  closePicker: () => void

  // Actions — Edge
  deleteEdge: (edgeId: string) => void
  addEdge: (connection: Connection) => void

  // Actions — Sync
  syncWorkflowFromRF: () => void
}

/** Re-compute RF nodes and edges from a workflow (runs auto-layout internally) */
function rebuildRF(workflow: Workflow): { rfNodes: Node<FlowNodeData>[]; rfEdges: Edge[] } {
  const stepNumbers = getStepNumbers(workflow.nodes, workflow.edges)
  const rfNodes = toRFNodes(workflow.nodes, stepNumbers, workflow.edges)
  const rfEdges = toRFEdges(workflow.edges)
  return { rfNodes, rfEdges }
}

export const useEditorStore = create<EditorState>((set) => ({
  workflow: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeId: null,
  isPanelOpen: false,
  isPickerOpen: false,
  pickerContext: null,

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      rfNodes: applyNodeChanges(changes, state.rfNodes) as Node<FlowNodeData>[],
    }))
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => {
      const newRfEdges = applyEdgeChanges(changes, state.rfEdges)

      // Sync removals to the canonical workflow model
      const removedIds = new Set(
        changes.filter((c) => c.type === 'remove').map((c) => c.id)
      )

      if (removedIds.size === 0 || !state.workflow) {
        return { rfEdges: newRfEdges }
      }

      const newEdges = state.workflow.edges.filter((e) => !removedIds.has(e.id))
      const updatedWf = { ...state.workflow, edges: newEdges }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
      return { rfEdges: newRfEdges, rfNodes, workflow: updatedWf }
    })
  },

  loadWorkflow: (workflow) => {
    const laidOut = autoLayout(workflow.nodes, workflow.edges)
    const wfWithPositions = { ...workflow, nodes: laidOut }
    const { rfNodes, rfEdges } = rebuildRF(wfWithPositions)
    set({ workflow: wfWithPositions, rfNodes, rfEdges })
  },

  setName: (name) =>
    set((state) => {
      if (!state.workflow) return state
      return { workflow: { ...state.workflow, name } }
    }),

  addNode: (node, context) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow
      const { sourceNodeId, sourceHandle, targetNodeId } = context

      const newNodes = [...wf.nodes, { ...node, position: { x: 0, y: 0 } }]
      let newEdges = [...wf.edges]

      // First node in an empty workflow — no source, no edges to create
      if (!sourceNodeId) {
        const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
        const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
        const wfFinal = { ...updatedWf, nodes: laidOut }
        const { rfNodes, rfEdges } = rebuildRF(wfFinal)
        return { workflow: wfFinal, rfNodes, rfEdges }
      }

      if (targetNodeId) {
        // Split existing edge: remove source→target, add source→new and new→target
        newEdges = newEdges.filter(
          (e) => !(
            e.source === sourceNodeId &&
            e.target === targetNodeId &&
            (!sourceHandle || e.sourceHandle === sourceHandle || (!e.sourceHandle && sourceHandle === 'main'))
          )
        )
        newEdges.push({
          id: `e-${Date.now()}-a`,
          source: sourceNodeId,
          target: node.id,
          sourceHandle: sourceHandle !== 'main' ? sourceHandle : undefined,
          type: sourceHandle === 'true' || sourceHandle === 'false' ? 'branch'
            : sourceHandle === 'loopBody' ? 'loop'
            : undefined,
          label: sourceHandle === 'true' ? 'True'
            : sourceHandle === 'false' ? 'False'
            : sourceHandle === 'loopBody' ? 'Loop'
            : undefined,
        })
        newEdges.push({
          id: `e-${Date.now()}-b`,
          source: node.id,
          target: targetNodeId,
        })
      } else {
        // Append: just add source→new edge
        newEdges.push({
          id: `e-${Date.now()}`,
          source: sourceNodeId,
          target: node.id,
          sourceHandle: sourceHandle !== 'main' ? sourceHandle : undefined,
          type: sourceHandle === 'true' || sourceHandle === 'false' ? 'branch'
            : sourceHandle === 'loopBody' ? 'loop'
            : undefined,
          label: sourceHandle === 'true' ? 'True'
            : sourceHandle === 'false' ? 'False'
            : sourceHandle === 'loopBody' ? 'Loop'
            : undefined,
        })
      }

      const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
      const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
      const wfFinal = { ...updatedWf, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wfFinal)

      return { workflow: wfFinal, rfNodes, rfEdges }
    }),

  deleteNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Find incoming and outgoing edges
      const incomingEdges = wf.edges.filter((e) => e.target === nodeId)
      const outgoingEdges = wf.edges.filter((e) => e.source === nodeId)

      // Remove the node
      const newNodes = wf.nodes.filter((n) => n.id !== nodeId)

      // Remove all edges involving this node
      let newEdges = wf.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)

      // Reconnect: for each incoming→deleted→outgoing, create incoming→outgoing
      for (const inc of incomingEdges) {
        for (const out of outgoingEdges) {
          newEdges.push({
            id: `e-${Date.now()}-${inc.source}-${out.target}`,
            source: inc.source,
            target: out.target,
            sourceHandle: inc.sourceHandle,
            type: inc.type,
            label: inc.label,
          })
        }
      }

      const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
      const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
      const wfFinal = { ...updatedWf, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wfFinal)

      return {
        workflow: wfFinal,
        rfNodes,
        rfEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isPanelOpen: state.selectedNodeId === nodeId ? false : state.isPanelOpen,
      }
    }),

  deleteEdge: (edgeId) =>
    set((state) => {
      if (!state.workflow) return state
      const newEdges = state.workflow.edges.filter((e) => e.id !== edgeId)
      const updatedWf = { ...state.workflow, edges: newEdges }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
      const rfEdges = toRFEdges(newEdges)
      return { workflow: updatedWf, rfNodes, rfEdges }
    }),

  addEdge: (connection) =>
    set((state) => {
      if (!state.workflow) return state
      const { source, target, sourceHandle, targetHandle } = connection
      if (!source || !target) return state

      const isTrue = sourceHandle === 'true'
      const isFalse = sourceHandle === 'false'
      const isLoop = sourceHandle === 'loopBody'

      const newEdge: WorkflowEdge = {
        id: `e-${Date.now()}`,
        source,
        target,
        sourceHandle: sourceHandle ?? undefined,
        targetHandle: targetHandle ?? undefined,
        type: isTrue || isFalse ? 'branch' : isLoop ? 'loop' : undefined,
        label: isTrue ? 'True' : isFalse ? 'False' : isLoop ? 'Loop' : undefined,
      }

      const newEdges = [...state.workflow.edges, newEdge]
      const updatedWf = { ...state.workflow, edges: newEdges }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
      const rfEdges = toRFEdges(newEdges)
      return { workflow: updatedWf, rfNodes, rfEdges }
    }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      if (!state.workflow) return state
      const newNodes = state.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, config } : n
      )
      const updatedWf = { ...state.workflow, nodes: newNodes }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
      return { workflow: updatedWf, rfNodes }
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => {
      if (!state.workflow) return state
      const newNodes = state.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, status } : n
      )
      const updatedWf = { ...state.workflow, nodes: newNodes }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
      return { workflow: updatedWf, rfNodes }
    }),

  runAutoLayout: () =>
    set((state) => {
      if (!state.workflow) return state
      const laidOut = autoLayout(state.workflow.nodes, state.workflow.edges)
      const wf = { ...state.workflow, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wf)
      return { workflow: wf, rfNodes, rfEdges }
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false, selectedNodeId: null }),

  openPicker: (context) => set({ isPickerOpen: true, pickerContext: context }),

  closePicker: () => set({ isPickerOpen: false, pickerContext: null }),

  syncWorkflowFromRF: () =>
    set((state) => {
      if (!state.workflow) return state
      const updatedNodes = fromRFNodes(state.workflow.nodes, state.rfNodes)
      return { workflow: { ...state.workflow, nodes: updatedNodes } }
    }),
}))
