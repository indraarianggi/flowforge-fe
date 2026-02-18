# Phase 3: Mock Services Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the mock service layer — async functions that simulate a real API using localStorage and seed data, wrapped by TanStack Query hooks.

**Architecture:** Each service file exports pure async functions that `delay()` then read/write localStorage. TanStack Query hooks in `src/hooks/` wrap these functions to provide loading states, caching, and cache invalidation throughout the app. When the real backend is ready, only the service functions change.

**Tech Stack:** TypeScript 5, TanStack Query 5, Vitest

---

### Task 1: Write Auth Service

**Files:**
- Create: `src/services/authService.ts`

**Step 1: Write the service**
```ts
// src/services/authService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedUser } from "@/mocks"
import type { User } from "@/types"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    await delay(600)
    // In mock mode, any email/password works — we return the seed user
    // but update the name/email to what they typed
    const user: User = {
      ...seedUser,
      email: credentials.email,
      updatedAt: new Date().toISOString(),
    }
    storage.set(STORAGE_KEYS.user, user)
    return user
  },

  async register(data: RegisterData): Promise<User> {
    await delay(800)
    const user: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.set(STORAGE_KEYS.user, user)
    return user
  },

  async logout(): Promise<void> {
    await delay(200)
    storage.clearAll()
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100)
    return storage.get<User>(STORAGE_KEYS.user)
  },
}
```

---

### Task 2: Write Workflow Service

**Files:**
- Create: `src/services/workflowService.ts`

**Step 1: Write the service**
```ts
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
```

---

### Task 3: Write Execution Service

**Files:**
- Create: `src/services/executionService.ts`

**Step 1: Write the service**
```ts
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
```

---

### Task 4: Write Credential Service

**Files:**
- Create: `src/services/credentialService.ts`

**Step 1: Write the service**
```ts
// src/services/credentialService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedCredentials } from "@/mocks"
import type { Credential } from "@/types"

function getCredentials(): Credential[] {
  const stored = storage.getList<Credential>(STORAGE_KEYS.credentials)
  if (stored.length === 0) {
    storage.set(STORAGE_KEYS.credentials, seedCredentials)
    return seedCredentials
  }
  return stored
}

export const credentialService = {
  async list(): Promise<Credential[]> {
    await delay(300)
    return getCredentials()
  },

  async get(id: string): Promise<Credential> {
    await delay(200)
    const cred = getCredentials().find((c) => c.id === id)
    if (!cred) throw new Error(`Credential ${id} not found`)
    return cred
  },

  async create(data: Pick<Credential, "name" | "type" | "metadata">): Promise<Credential> {
    await delay(500)
    const user = storage.get<{ id: string }>(STORAGE_KEYS.user)
    const credential: Credential = {
      id: `cred-${Date.now()}`,
      userId: user?.id ?? "user-001",
      name: data.name,
      type: data.type,
      status: "connected",
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.addToList(STORAGE_KEYS.credentials, credential)
    return credential
  },

  async update(id: string, patch: Partial<Credential>): Promise<Credential> {
    await delay(300)
    storage.updateInList<Credential>(STORAGE_KEYS.credentials, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    const updated = getCredentials().find((c) => c.id === id)
    if (!updated) throw new Error(`Credential ${id} not found`)
    return updated
  },

  async delete(id: string): Promise<void> {
    await delay(300)
    storage.removeFromList(STORAGE_KEYS.credentials, id)
  },

  async test(id: string): Promise<{ ok: boolean; message: string }> {
    await delay(800)
    // Mock: always succeeds for connected, fails for expired
    const cred = getCredentials().find((c) => c.id === id)
    if (!cred) return { ok: false, message: "Credential not found" }
    if (cred.status === "expired") {
      return { ok: false, message: "Token has expired. Please reconnect." }
    }
    return { ok: true, message: "Connection successful" }
  },
}
```

---

### Task 5: Write TanStack Query Hooks

**Files:**
- Create: `src/hooks/useWorkflows.ts`
- Create: `src/hooks/useExecutions.ts`
- Create: `src/hooks/useCredentials.ts`

**Step 1: Create `src/hooks/useWorkflows.ts`**
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { workflowService } from "@/services/workflowService"
import type { Workflow, WorkflowNode } from "@/types"

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
      nodeOrder,
    }: {
      workflowId: string
      nodes: WorkflowNode[]
      nodeOrder: string[]
    }) => workflowService.saveNodes(workflowId, nodes, nodeOrder),
    onSuccess: (_, { workflowId }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) })
    },
  })
}
```

**Step 2: Create `src/hooks/useExecutions.ts`**
```ts
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
```

**Step 3: Create `src/hooks/useCredentials.ts`**
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { credentialService } from "@/services/credentialService"
import type { Credential } from "@/types"

export const credentialKeys = {
  all: ["credentials"] as const,
  detail: (id: string) => ["credentials", id] as const,
}

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.all,
    queryFn: credentialService.list,
  })
}

export function useCreateCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: credentialService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: credentialKeys.all }),
  })
}

export function useDeleteCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: credentialService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: credentialKeys.all }),
  })
}

export function useTestCredential() {
  return useMutation({
    mutationFn: credentialService.test,
  })
}
```

---

### Task 6: Wire Up TanStack Query Provider

**Files:**
- Modify: `src/main.tsx`

**Step 1: Update `src/main.tsx`**
```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Toaster } from "sonner"
import "./index.css"
import App from "./App"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

---

### Task 7: Test Services

**Files:**
- Create: `src/services/workflowService.test.ts`

**Step 1: Write tests**
```ts
import { describe, it, expect, beforeEach } from "vitest"
import { workflowService } from "./workflowService"
import storage, { STORAGE_KEYS } from "@/lib/storage"

describe("workflowService", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("list() returns seed workflows on first call", async () => {
    const workflows = await workflowService.list()
    expect(workflows.length).toBeGreaterThan(0)
  })

  it("create() adds a new workflow", async () => {
    const workflow = await workflowService.create({ name: "Test Workflow" })
    expect(workflow.name).toBe("Test Workflow")
    expect(workflow.isActive).toBe(false)

    const all = await workflowService.list()
    expect(all.some((w) => w.id === workflow.id)).toBe(true)
  })

  it("update() patches a workflow", async () => {
    const workflow = await workflowService.create({ name: "Original" })
    const updated = await workflowService.update(workflow.id, { name: "Renamed" })
    expect(updated.name).toBe("Renamed")
  })

  it("delete() removes a workflow", async () => {
    const workflow = await workflowService.create({ name: "To Delete" })
    await workflowService.delete(workflow.id)
    const all = await workflowService.list()
    expect(all.some((w) => w.id === workflow.id)).toBe(false)
  })

  it("toggleActive() flips isActive", async () => {
    const workflow = await workflowService.create({ name: "Toggle Test" })
    expect(workflow.isActive).toBe(false)
    const toggled = await workflowService.toggleActive(workflow.id)
    expect(toggled.isActive).toBe(true)
  })
})
```

**Step 2: Run tests**
```bash
npm run test:run -- src/services/workflowService.test.ts
```
Expected: All 5 tests PASS.

---

### Task 8: Commit

**Step 1: Run all tests**
```bash
npm run test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: add mock service layer and TanStack Query hooks"
```
