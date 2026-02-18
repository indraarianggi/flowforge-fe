// src/services/executionService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedExecutions } from "@/mocks"
import type { Execution, NodeExecution, NodeExecutionStatus, Workflow } from "@/types"

function getExecutions(): Execution[] {
  const stored = storage.getList<Execution>(STORAGE_KEYS.executions)
  if (stored.length === 0) {
    storage.set(STORAGE_KEYS.executions, seedExecutions)
    return seedExecutions
  }
  return stored
}

export const executionService = {
  async list(workflowId?: string): Promise<Execution[]> {
    await delay(300)
    const all = getExecutions()
    return workflowId ? all.filter((e) => e.workflowId === workflowId) : all
  },

  async get(id: string): Promise<Execution> {
    await delay(200)
    const execution = getExecutions().find((e) => e.id === id)
    if (!execution) throw new Error(`Execution ${id} not found`)
    return execution
  },

  async create(workflow: Workflow): Promise<Execution> {
    await delay(200)
    const execution: Execution = {
      id: `exec-${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "running",
      mode: "manual",
      nodeExecutions: workflow.nodes.map((node, index) => ({
        id: `ne-${Date.now()}-${index}`,
        executionId: `exec-${Date.now()}`,
        nodeId: node.id,
        nodeLabel: node.label,
        stepIndex: index,
        status: "pending" as NodeExecutionStatus,
        retryCount: 0,
      })),
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    storage.addToList(STORAGE_KEYS.executions, execution)
    return execution
  },

  async updateNodeStatus(
    executionId: string,
    nodeId: string,
    patch: Partial<NodeExecution>
  ): Promise<void> {
    await delay(50)
    const executions = getExecutions()
    const execution = executions.find((e) => e.id === executionId)
    if (!execution) return
    const updated: Execution = {
      ...execution,
      nodeExecutions: execution.nodeExecutions.map((ne) =>
        ne.nodeId === nodeId ? { ...ne, ...patch } : ne
      ),
    }
    storage.updateInList(STORAGE_KEYS.executions, executionId, updated)
  },

  async complete(
    executionId: string,
    status: "success" | "failed",
    errorMessage?: string
  ): Promise<void> {
    await delay(50)
    storage.updateInList<Execution>(STORAGE_KEYS.executions, executionId, {
      status,
      errorMessage,
      finishedAt: new Date().toISOString(),
    })
  },

  // Simulate sequential node execution with delays
  async simulate(
    execution: Execution,
    onNodeUpdate: (executionId: string, nodeId: string, patch: Partial<NodeExecution>) => void
  ): Promise<void> {
    const nodes = execution.nodeExecutions

    for (const nodeExec of nodes) {
      // Mark as running
      const startedAt = new Date().toISOString()
      onNodeUpdate(execution.id, nodeExec.nodeId, {
        status: "running",
        startedAt,
      })
      await executionService.updateNodeStatus(execution.id, nodeExec.nodeId, {
        status: "running",
        startedAt,
      })

      // Simulate processing time
      const duration = 300 + Math.random() * 700
      await delay(duration)

      // Random failure on ~10% of nodes (skip trigger nodes)
      const shouldFail = nodeExec.stepIndex > 0 && Math.random() < 0.1
      const finishedAt = new Date().toISOString()

      if (shouldFail) {
        onNodeUpdate(execution.id, nodeExec.nodeId, {
          status: "failed",
          errorMessage: "Simulated error: upstream service returned 500",
          durationMs: Math.round(duration),
          finishedAt,
        })
        await executionService.updateNodeStatus(execution.id, nodeExec.nodeId, {
          status: "failed",
          errorMessage: "Simulated error: upstream service returned 500",
          durationMs: Math.round(duration),
          finishedAt,
        })
        await executionService.complete(execution.id, "failed", "Simulated error")
        return
      }

      onNodeUpdate(execution.id, nodeExec.nodeId, {
        status: "success",
        outputData: { result: "ok", timestamp: finishedAt },
        durationMs: Math.round(duration),
        finishedAt,
      })
      await executionService.updateNodeStatus(execution.id, nodeExec.nodeId, {
        status: "success",
        outputData: { result: "ok", timestamp: finishedAt },
        durationMs: Math.round(duration),
        finishedAt,
      })
    }

    await executionService.complete(execution.id, "success")
  },
}
