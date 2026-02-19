// src/stores/executionStore.ts
import { create } from "zustand"
import type { Execution, NodeExecution } from "@/types"

interface ExecutionState {
  liveExecution: Execution | null
  isSimulating: boolean

  startSimulation: (execution: Execution) => void
  updateNodeExecution: (executionId: string, nodeId: string, patch: Partial<NodeExecution>) => void
  completeSimulation: (status: "success" | "failed", errorMessage?: string) => void
  clearLive: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  liveExecution: null,
  isSimulating: false,

  startSimulation: (execution) =>
    set({ liveExecution: execution, isSimulating: true }),

  updateNodeExecution: (executionId, nodeId, patch) =>
    set((state) => {
      if (!state.liveExecution || state.liveExecution.id !== executionId) return state
      return {
        liveExecution: {
          ...state.liveExecution,
          nodeExecutions: state.liveExecution.nodeExecutions.map((ne) =>
            ne.nodeId === nodeId ? { ...ne, ...patch } : ne
          ),
        },
      }
    }),

  completeSimulation: (status, errorMessage) =>
    set((state) => {
      if (!state.liveExecution) return state
      return {
        isSimulating: false,
        liveExecution: {
          ...state.liveExecution,
          status,
          errorMessage,
          finishedAt: new Date().toISOString(),
        },
      }
    }),

  clearLive: () => set({ liveExecution: null, isSimulating: false }),
}))
