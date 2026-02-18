// src/services/workflowService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedWorkflows } from "@/mocks"
import type { Workflow, WorkflowNode } from "@/types"

function getWorkflows(): Workflow[] {
  const stored = storage.getList<Workflow>(STORAGE_KEYS.workflows)
  if (stored.length === 0) {
    storage.set(STORAGE_KEYS.workflows, seedWorkflows)
    return seedWorkflows
  }
  return stored
}

export const workflowService = {
  async list(): Promise<Workflow[]> {
    await delay(300)
    return getWorkflows()
  },

  async get(id: string): Promise<Workflow> {
    await delay(200)
    const workflow = getWorkflows().find((w) => w.id === id)
    if (!workflow) throw new Error(`Workflow ${id} not found`)
    return workflow
  },

  async create(data: Pick<Workflow, "name" | "description">): Promise<Workflow> {
    await delay(400)
    const user = storage.get<{ id: string }>(STORAGE_KEYS.user)
    const workflow: Workflow = {
      id: `wf-${Date.now()}`,
      userId: user?.id ?? "user-001",
      name: data.name,
      description: data.description,
      isActive: false,
      nodes: [],
      nodeOrder: [],
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.addToList(STORAGE_KEYS.workflows, workflow)
    return workflow
  },

  async update(id: string, patch: Partial<Workflow>): Promise<Workflow> {
    await delay(300)
    storage.updateInList<Workflow>(STORAGE_KEYS.workflows, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    const updated = getWorkflows().find((w) => w.id === id)
    if (!updated) throw new Error(`Workflow ${id} not found`)
    return updated
  },

  async delete(id: string): Promise<void> {
    await delay(300)
    storage.removeFromList(STORAGE_KEYS.workflows, id)
  },

  async toggleActive(id: string): Promise<Workflow> {
    await delay(200)
    const workflow = getWorkflows().find((w) => w.id === id)
    if (!workflow) throw new Error(`Workflow ${id} not found`)
    return workflowService.update(id, { isActive: !workflow.isActive })
  },

  async duplicate(id: string): Promise<Workflow> {
    await delay(400)
    const source = getWorkflows().find((w) => w.id === id)
    if (!source) throw new Error(`Workflow ${id} not found`)
    const copy: Workflow = {
      ...source,
      id: `wf-${Date.now()}`,
      name: `${source.name} (Copy)`,
      isActive: false,
      lastRunAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.addToList(STORAGE_KEYS.workflows, copy)
    return copy
  },

  // Node-level operations (saves the whole workflow)
  async saveNodes(
    workflowId: string,
    nodes: WorkflowNode[],
    nodeOrder: string[]
  ): Promise<Workflow> {
    return workflowService.update(workflowId, { nodes, nodeOrder })
  },
}
