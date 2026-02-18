import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { executionService } from "@/services/executionService"
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
