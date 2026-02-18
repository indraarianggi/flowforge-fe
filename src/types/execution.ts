// src/types/execution.ts
export type ExecutionStatus = "running" | "success" | "failed" | "cancelled" | "waiting"
export type NodeExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped"

export interface NodeExecution {
  id: string
  executionId: string
  nodeId: string
  nodeLabel: string
  stepIndex: number
  status: NodeExecutionStatus
  inputData?: Record<string, unknown>
  outputData?: Record<string, unknown>
  errorMessage?: string
  durationMs?: number
  retryCount: number
  branchPath?: "true" | "false" | "body"
  loopIteration?: number
  loopTotal?: number
  startedAt?: string
  finishedAt?: string
}

export interface Execution {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  mode: "manual" | "webhook" | "schedule" | "retry"
  nodeExecutions: NodeExecution[]
  triggerData?: Record<string, unknown>
  errorMessage?: string
  errorNodeId?: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  createdAt: string
}
