import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { executionService } from "@/services/executionService"
import { useExecutionStore } from "@/stores/executionStore"
import type { Workflow } from "@/types"

export const executionKeys = {
  all: ["executions"] as const,
  byWorkflow: (workflowId: string) => ["executions", "workflow", workflowId] as const,
  detail: (id: string) => ["executions", id] as const,
}

export function useExecutions(workflowId?: string) {
  return useQuery({
    queryKey: workflowId ? executionKeys.byWorkflow(workflowId) : executionKeys.all,
    queryFn: () => executionService.list(workflowId),
  })
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: executionKeys.detail(id),
    queryFn: () => executionService.get(id),
    enabled: !!id,
  })
}

export function useRunWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (workflow: Workflow) => executionService.create(workflow),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: executionKeys.all })
    },
  })
}

export function useRunWorkflowWithSimulation() {
  const qc = useQueryClient()
  const { startSimulation, updateNodeExecution, completeSimulation } = useExecutionStore()

  return useMutation({
    mutationFn: async (workflow: Workflow) => {
      const execution = await executionService.create(workflow)
      return execution
    },
    onSuccess: (execution) => {
      qc.invalidateQueries({ queryKey: executionKeys.all })
      // Start simulation in background — non-blocking
      startSimulation(execution)
      executionService.simulate(execution, (execId, nodeId, patch) => {
        updateNodeExecution(execId, nodeId, patch)
      }).then(() => {
        completeSimulation("success")
        qc.invalidateQueries({ queryKey: executionKeys.all })
      }).catch(() => {
        completeSimulation("failed", "Simulation error")
      })
    },
  })
}
