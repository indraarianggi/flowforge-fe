import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { workflowService } from "@/services/workflowService"
import type { Workflow, WorkflowNode, WorkflowEdge } from "@/types"

export const workflowKeys = {
  all: ["workflows"] as const,
  detail: (id: string) => ["workflows", id] as const,
}

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.all,
    queryFn: workflowService.list,
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => workflowService.get(id),
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workflowService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Workflow> }) =>
      workflowService.update(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.all })
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) })
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workflowService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  })
}

export function useToggleWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workflowService.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  })
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: workflowService.duplicate,
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  })
}

export function useSaveWorkflowNodes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workflowId,
      nodes,
      edges,
    }: {
      workflowId: string
      nodes: WorkflowNode[]
      edges: WorkflowEdge[]
    }) => workflowService.saveNodes(workflowId, nodes, edges),
    onSuccess: (_, { workflowId }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) })
    },
  })
}
