// src/stores/editorStore.ts
import { create } from "zustand"
import type { Workflow, WorkflowNode } from "@/types"

interface EditorState {
  workflow: Workflow | null
  selectedNodeId: string | null
  isPanelOpen: boolean
  isPickerOpen: boolean
  pickerInsertAfterNodeId: string | null // null = append to top-level
  pickerParentNodeId: string | null       // for inserting into branch/loop
  pickerBranchType: "true" | "false" | "body" | null

  // Actions
  setWorkflow: (workflow: Workflow) => void
  selectNode: (nodeId: string | null) => void
  openPanel: (nodeId: string) => void
  closePanel: () => void
  openPicker: (opts: {
    insertAfterNodeId: string | null
    parentNodeId?: string | null
    branchType?: "true" | "false" | "body" | null
  }) => void
  closePicker: () => void
  updateNodeConfig: (nodeId: string, config: WorkflowNode["config"]) => void
  updateNodeStatus: (nodeId: string, status: WorkflowNode["status"]) => void
  addNode: (node: WorkflowNode, insertAfterNodeId: string | null, parentNodeId?: string | null, branchType?: "true" | "false" | "body" | null) => void
  deleteNode: (nodeId: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workflow: null,
  selectedNodeId: null,
  isPanelOpen: false,
  isPickerOpen: false,
  pickerInsertAfterNodeId: null,
  pickerParentNodeId: null,
  pickerBranchType: null,

  setWorkflow: (workflow) => set({ workflow }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  openPanel: (nodeId) => set({ selectedNodeId: nodeId, isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false, selectedNodeId: null }),

  openPicker: ({ insertAfterNodeId, parentNodeId = null, branchType = null }) =>
    set({
      isPickerOpen: true,
      pickerInsertAfterNodeId: insertAfterNodeId,
      pickerParentNodeId: parentNodeId,
      pickerBranchType: branchType,
    }),

  closePicker: () =>
    set({
      isPickerOpen: false,
      pickerInsertAfterNodeId: null,
      pickerParentNodeId: null,
      pickerBranchType: null,
    }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      if (!state.workflow) return state
      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, config } : n
          ),
        },
      }
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => {
      if (!state.workflow) return state
      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, status } : n
          ),
        },
      }
    }),

  addNode: (node, insertAfterNodeId, parentNodeId, branchType) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Top-level insertion
      if (!parentNodeId) {
        const order = [...wf.nodeOrder]
        const insertIdx = insertAfterNodeId
          ? order.indexOf(insertAfterNodeId) + 1
          : order.length
        order.splice(insertIdx, 0, node.id)
        return {
          workflow: {
            ...wf,
            nodes: [...wf.nodes, node],
            nodeOrder: order,
          },
        }
      }

      // Inserting into a branch or loop body
      const nodes = wf.nodes.map((n) => {
        if (n.id !== parentNodeId) return n
        if (branchType === "true") {
          const ids = [...(n.trueBranchNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, trueBranchNodeIds: ids }
        }
        if (branchType === "false") {
          const ids = [...(n.falseBranchNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, falseBranchNodeIds: ids }
        }
        if (branchType === "body") {
          const ids = [...(n.bodyNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, bodyNodeIds: ids }
        }
        return n
      })

      return {
        workflow: {
          ...wf,
          nodes: [...nodes, { ...node, parentId: parentNodeId, branchType: branchType ?? undefined }],
        },
      }
    }),

  deleteNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Remove from nodes array and from all id lists
      const nodes = wf.nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          trueBranchNodeIds: n.trueBranchNodeIds?.filter((id) => id !== nodeId),
          falseBranchNodeIds: n.falseBranchNodeIds?.filter((id) => id !== nodeId),
          bodyNodeIds: n.bodyNodeIds?.filter((id) => id !== nodeId),
        }))

      return {
        workflow: {
          ...wf,
          nodes,
          nodeOrder: wf.nodeOrder.filter((id) => id !== nodeId),
        },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isPanelOpen: state.selectedNodeId === nodeId ? false : state.isPanelOpen,
      }
    }),
}))
