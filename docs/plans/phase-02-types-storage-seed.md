# Phase 2: Types, Storage & Seed Data Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define all TypeScript types mirroring the ERD, build a typed localStorage helper, and create seed data so the app has realistic content on first load.

**Architecture:** Types live in `src/types/` and mirror the ERD schema exactly. `src/lib/storage.ts` is a thin typed CRUD wrapper over `localStorage`. Seed data in `src/mocks/` pre-populates the app if localStorage is empty.

**Tech Stack:** TypeScript 5, Vitest

---

### Task 1: Define User & Auth Types

**Files:**
- Create: `src/types/user.ts`

**Step 1: Write the type**
```ts
// src/types/user.ts
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}
```

---

### Task 2: Define Credential Types

**Files:**
- Create: `src/types/credential.ts`

**Step 1: Write the types**
```ts
// src/types/credential.ts
export type CredentialType = "telegram" | "google"
export type CredentialStatus = "connected" | "expired" | "invalid"

export interface Credential {
  id: string
  userId: string
  name: string
  type: CredentialType
  status: CredentialStatus
  metadata: Record<string, unknown>
  expiresAt?: string
  createdAt: string
  updatedAt: string
}
```

---

### Task 3: Define Workflow & Node Types

**Files:**
- Create: `src/types/workflow.ts`

**Step 1: Write node type definitions**
```ts
// src/types/workflow.ts

export type NodeType =
  | "manual_trigger"
  | "webhook_trigger"
  | "schedule_trigger"
  | "telegram_trigger"
  | "http_request"
  | "if_condition"
  | "set_transform"
  | "code"
  | "loop"
  | "wait"
  | "merge"
  | "telegram_send_message"
  | "google_sheets_append"
  | "google_sheets_read"

export type NodeCategory = "trigger" | "action" | "flow_control" | "integration"

// Config shapes per node type
export interface ManualTriggerConfig {
  sampleData?: string // JSON string
}

export interface WebhookTriggerConfig {
  path: string
  method: "GET" | "POST" | "ANY"
  responseMode: "immediately" | "after_workflow"
}

export interface ScheduleTriggerConfig {
  preset: "every_5m" | "hourly" | "daily" | "weekly" | "monthly" | "custom"
  cron?: string
  timezone: string
}

export interface HttpRequestConfig {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers: Array<{ key: string; value: string }>
  queryParams: Array<{ key: string; value: string }>
  bodyType: "json" | "form" | "raw"
  body?: string
  authType: "none" | "bearer" | "basic" | "api_key"
  authConfig?: Record<string, string>
  timeout: number
}

export interface ConditionRow {
  id: string
  field: string
  operation:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty"
    | "regex"
  value: string
}

export interface IfConditionConfig {
  combinator: "AND" | "OR"
  conditions: ConditionRow[]
}

export interface SetTransformConfig {
  fields: Array<{ id: string; name: string; value: string }>
}

export interface CodeConfig {
  code: string
  inputMappings: Array<{ name: string; expression: string }>
}

export interface LoopConfig {
  mode: "forEach" | "count"
  source?: string // expression for forEach
  count?: string // number or expression for count
  batchSize: number
  onItemError: "stopAll" | "skipItem" | "stopLoop"
}

export interface WaitConfig {
  mode: "duration" | "webhookResume"
  durationValue?: number
  durationUnit?: "seconds" | "minutes" | "hours"
  maxWaitHours?: number
}

export interface MergeConfig {
  strategy: "append" | "choose_branch" | "combine_by_key"
  keyField?: string
}

export interface IntegrationConfig {
  credentialId?: string
  [key: string]: unknown
}

export type NodeConfig =
  | ManualTriggerConfig
  | WebhookTriggerConfig
  | ScheduleTriggerConfig
  | HttpRequestConfig
  | IfConditionConfig
  | SetTransformConfig
  | CodeConfig
  | LoopConfig
  | WaitConfig
  | MergeConfig
  | IntegrationConfig

export type NodeStatus = "unconfigured" | "configured" | "tested" | "error"

export interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  category: NodeCategory
  status: NodeStatus
  config: NodeConfig
  // For IF node branches
  trueBranchNodeIds?: string[]
  falseBranchNodeIds?: string[]
  // For Loop node body
  bodyNodeIds?: string[]
  // Position in flow
  parentId?: string // for nodes inside branches/loops
  branchType?: "true" | "false" | "body"
}

export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  isActive: boolean
  nodes: WorkflowNode[]
  // Ordered list of top-level node IDs
  nodeOrder: string[]
  settings: {
    timeout?: number
    errorMode?: "stop" | "continue"
  }
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}
```

---

### Task 4: Define Execution Types

**Files:**
- Create: `src/types/execution.ts`

**Step 1: Write the types**
```ts
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
```

---

### Task 5: Update Types Index

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Export all types**
```ts
export * from "./user"
export * from "./credential"
export * from "./workflow"
export * from "./execution"
```

---

### Task 6: Write Storage Helper

**Files:**
- Create: `src/lib/storage.ts`

**Step 1: Write the storage helper**
```ts
// src/lib/storage.ts

const PREFIX = "flowforge:"

export const STORAGE_KEYS = {
  user: `${PREFIX}user`,
  workflows: `${PREFIX}workflows`,
  executions: `${PREFIX}executions`,
  nodeExecutions: `${PREFIX}node_executions`,
  credentials: `${PREFIX}credentials`,
} as const

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

const storage = {
  get<T>(key: string): T | null {
    return read<T>(key)
  },

  set<T>(key: string, value: T): void {
    write(key, value)
  },

  getList<T extends { id: string }>(key: string): T[] {
    return read<T[]>(key) ?? []
  },

  addToList<T extends { id: string }>(key: string, item: T): void {
    const list = read<T[]>(key) ?? []
    write(key, [...list, item])
  },

  updateInList<T extends { id: string }>(
    key: string,
    id: string,
    patch: Partial<T>
  ): void {
    const list = read<T[]>(key) ?? []
    write(
      key,
      list.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  },

  removeFromList<T extends { id: string }>(key: string, id: string): void {
    const list = read<T[]>(key) ?? []
    write(
      key,
      list.filter((item) => item.id !== id)
    )
  },

  clear(key: string): void {
    localStorage.removeItem(key)
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  },
}

export default storage
```

---

### Task 7: Test Storage Helper

**Files:**
- Create: `src/lib/storage.test.ts`

**Step 1: Write tests**
```ts
// src/lib/storage.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import storage from "./storage"

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("get returns null when key does not exist", () => {
    expect(storage.get("flowforge:missing")).toBeNull()
  })

  it("set and get round-trip", () => {
    storage.set("flowforge:test", { name: "Alice" })
    expect(storage.get("flowforge:test")).toEqual({ name: "Alice" })
  })

  it("getList returns empty array when key missing", () => {
    expect(storage.getList("flowforge:items")).toEqual([])
  })

  it("addToList appends item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.addToList("flowforge:items", { id: "2", name: "B" })
    expect(storage.getList("flowforge:items")).toHaveLength(2)
  })

  it("updateInList patches matching item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.updateInList("flowforge:items", "1", { name: "Updated" })
    const list = storage.getList<{ id: string; name: string }>("flowforge:items")
    expect(list[0].name).toBe("Updated")
  })

  it("removeFromList removes matching item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.addToList("flowforge:items", { id: "2", name: "B" })
    storage.removeFromList("flowforge:items", "1")
    expect(storage.getList("flowforge:items")).toHaveLength(1)
  })
})
```

**Step 2: Run tests**
```bash
pnpm test:run -- src/lib/storage.test.ts
```
Expected: All 6 tests PASS.

---

### Task 8: Write Seed Data — User & Credentials

**Files:**
- Create: `src/mocks/user.ts`
- Create: `src/mocks/credentials.ts`

**Step 1: Create `src/mocks/user.ts`**
```ts
import type { User } from "@/types"

export const seedUser: User = {
  id: "user-001",
  email: "demo@flowforge.app",
  name: "Demo User",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}
```

**Step 2: Create `src/mocks/credentials.ts`**
```ts
import type { Credential } from "@/types"

export const seedCredentials: Credential[] = [
  {
    id: "cred-001",
    userId: "user-001",
    name: "My Telegram Bot",
    type: "telegram",
    status: "connected",
    metadata: { botUsername: "@myflowforgebot" },
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T08:00:00.000Z",
  },
  {
    id: "cred-002",
    userId: "user-001",
    name: "Google Workspace",
    type: "google",
    status: "expired",
    metadata: { email: "demo@gmail.com" },
    expiresAt: "2026-01-15T00:00:00.000Z",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
]
```

---

### Task 9: Write Seed Data — Workflows

**Files:**
- Create: `src/mocks/workflows.ts`

**Step 1: Write seed workflows**
```ts
import type { Workflow } from "@/types"

export const seedWorkflows: Workflow[] = [
  // Workflow 1: Simple linear HTTP workflow
  {
    id: "wf-001",
    userId: "user-001",
    name: "Daily Weather Report",
    description: "Fetch weather data and send via Telegram every morning",
    isActive: true,
    nodeOrder: ["n-001", "n-002", "n-003"],
    nodes: [
      {
        id: "n-001",
        type: "schedule_trigger",
        label: "Every day at 9am",
        category: "trigger",
        status: "configured",
        config: {
          preset: "daily",
          cron: "0 9 * * *",
          timezone: "Asia/Jakarta",
        },
      },
      {
        id: "n-002",
        type: "http_request",
        label: "Fetch Weather API",
        category: "action",
        status: "tested",
        config: {
          url: "https://api.weather.example.com/current?city=Jakarta",
          method: "GET",
          headers: [],
          queryParams: [],
          bodyType: "json",
          authType: "none",
          timeout: 5000,
        },
      },
      {
        id: "n-003",
        type: "telegram_send_message",
        label: "Send Weather Report",
        category: "integration",
        status: "configured",
        config: {
          credentialId: "cred-001",
        },
      },
    ],
    settings: {},
    lastRunAt: "2026-02-18T09:00:00.000Z",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-02-18T09:00:00.000Z",
  },

  // Workflow 2: IF branch workflow
  {
    id: "wf-002",
    userId: "user-001",
    name: "Lead Qualifier",
    description: "Qualify incoming leads and route to appropriate team",
    isActive: true,
    nodeOrder: ["n-010", "n-011", "n-012", "n-013", "n-014"],
    nodes: [
      {
        id: "n-010",
        type: "webhook_trigger",
        label: "New Lead Webhook",
        category: "trigger",
        status: "configured",
        config: {
          path: "lead-qualifier-abc123",
          method: "POST",
          responseMode: "immediately",
        },
      },
      {
        id: "n-011",
        type: "if_condition",
        label: "Check Lead Score",
        category: "action",
        status: "configured",
        config: {
          combinator: "AND",
          conditions: [
            {
              id: "c-001",
              field: "{{ $trigger.json.score }}",
              operation: "greater_than",
              value: "70",
            },
          ],
        },
        trueBranchNodeIds: ["n-012"],
        falseBranchNodeIds: ["n-013"],
      },
      {
        id: "n-012",
        type: "http_request",
        label: "Notify Sales Team",
        category: "action",
        status: "configured",
        parentId: "n-011",
        branchType: "true",
        config: {
          url: "https://hooks.example.com/sales",
          method: "POST",
          headers: [],
          queryParams: [],
          bodyType: "json",
          body: '{"lead": "{{ $trigger.json }}"}',
          authType: "none",
          timeout: 5000,
        },
      },
      {
        id: "n-013",
        type: "http_request",
        label: "Add to Nurture Campaign",
        category: "action",
        status: "configured",
        parentId: "n-011",
        branchType: "false",
        config: {
          url: "https://hooks.example.com/nurture",
          method: "POST",
          headers: [],
          queryParams: [],
          bodyType: "json",
          body: '{"lead": "{{ $trigger.json }}"}',
          authType: "none",
          timeout: 5000,
        },
      },
      {
        id: "n-014",
        type: "merge",
        label: "Merge Branches",
        category: "flow_control",
        status: "configured",
        config: {
          strategy: "choose_branch",
        },
      },
    ],
    settings: {},
    lastRunAt: "2026-02-17T14:30:00.000Z",
    createdAt: "2026-01-20T11:00:00.000Z",
    updatedAt: "2026-02-17T14:30:00.000Z",
  },

  // Workflow 3: Loop workflow (inactive)
  {
    id: "wf-003",
    userId: "user-001",
    name: "Bulk Email Sender",
    description: "Send personalized emails to each row in a Google Sheet",
    isActive: false,
    nodeOrder: ["n-020", "n-021", "n-022"],
    nodes: [
      {
        id: "n-020",
        type: "manual_trigger",
        label: "Manual Trigger",
        category: "trigger",
        status: "configured",
        config: {
          sampleData: '{"rows": [{"email": "a@example.com", "name": "Alice"}]}',
        },
      },
      {
        id: "n-021",
        type: "loop",
        label: "For Each Row",
        category: "flow_control",
        status: "configured",
        config: {
          mode: "forEach",
          source: "{{ $trigger.json.rows }}",
          batchSize: 1,
          onItemError: "skipItem",
        },
        bodyNodeIds: ["n-022"],
      },
      {
        id: "n-022",
        type: "http_request",
        label: "Send Email",
        category: "action",
        status: "configured",
        parentId: "n-021",
        branchType: "body",
        config: {
          url: "https://api.email.example.com/send",
          method: "POST",
          headers: [],
          queryParams: [],
          bodyType: "json",
          body: '{"to": "{{ $item.email }}", "name": "{{ $item.name }}"}',
          authType: "bearer",
          authConfig: { token: "my-email-api-key" },
          timeout: 10000,
        },
      },
    ],
    settings: {},
    lastRunAt: "2026-02-10T10:00:00.000Z",
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z",
  },
]
```

---

### Task 10: Write Seed Data — Executions

**Files:**
- Create: `src/mocks/executions.ts`

**Step 1: Write seed executions**
```ts
import type { Execution } from "@/types"

export const seedExecutions: Execution[] = [
  {
    id: "exec-001",
    workflowId: "wf-001",
    workflowName: "Daily Weather Report",
    status: "success",
    mode: "schedule",
    nodeExecutions: [
      {
        id: "ne-001",
        executionId: "exec-001",
        nodeId: "n-001",
        nodeLabel: "Every day at 9am",
        stepIndex: 0,
        status: "success",
        outputData: { timestamp: "2026-02-18T09:00:00.000Z" },
        durationMs: 12,
        retryCount: 0,
        startedAt: "2026-02-18T09:00:00.000Z",
        finishedAt: "2026-02-18T09:00:00.012Z",
      },
      {
        id: "ne-002",
        executionId: "exec-001",
        nodeId: "n-002",
        nodeLabel: "Fetch Weather API",
        stepIndex: 1,
        status: "success",
        inputData: { timestamp: "2026-02-18T09:00:00.000Z" },
        outputData: { statusCode: 200, body: { temp: 28, condition: "Sunny" } },
        durationMs: 342,
        retryCount: 0,
        startedAt: "2026-02-18T09:00:00.012Z",
        finishedAt: "2026-02-18T09:00:00.354Z",
      },
      {
        id: "ne-003",
        executionId: "exec-001",
        nodeId: "n-003",
        nodeLabel: "Send Weather Report",
        stepIndex: 2,
        status: "success",
        inputData: { temp: 28, condition: "Sunny" },
        outputData: { messageId: 12345, ok: true },
        durationMs: 210,
        retryCount: 0,
        startedAt: "2026-02-18T09:00:00.354Z",
        finishedAt: "2026-02-18T09:00:00.564Z",
      },
    ],
    startedAt: "2026-02-18T09:00:00.000Z",
    finishedAt: "2026-02-18T09:00:00.600Z",
    durationMs: 600,
    createdAt: "2026-02-18T09:00:00.000Z",
  },
  {
    id: "exec-002",
    workflowId: "wf-001",
    workflowName: "Daily Weather Report",
    status: "failed",
    mode: "schedule",
    nodeExecutions: [
      {
        id: "ne-004",
        executionId: "exec-002",
        nodeId: "n-001",
        nodeLabel: "Every day at 9am",
        stepIndex: 0,
        status: "success",
        outputData: { timestamp: "2026-02-17T09:00:00.000Z" },
        durationMs: 10,
        retryCount: 0,
        startedAt: "2026-02-17T09:00:00.000Z",
        finishedAt: "2026-02-17T09:00:00.010Z",
      },
      {
        id: "ne-005",
        executionId: "exec-002",
        nodeId: "n-002",
        nodeLabel: "Fetch Weather API",
        stepIndex: 1,
        status: "failed",
        inputData: { timestamp: "2026-02-17T09:00:00.000Z" },
        errorMessage: "Request timeout after 5000ms. The upstream API did not respond in time.",
        durationMs: 5001,
        retryCount: 0,
        startedAt: "2026-02-17T09:00:00.010Z",
        finishedAt: "2026-02-17T09:00:05.011Z",
      },
    ],
    errorMessage: "Request timeout after 5000ms.",
    errorNodeId: "n-002",
    startedAt: "2026-02-17T09:00:00.000Z",
    finishedAt: "2026-02-17T09:00:05.011Z",
    durationMs: 5011,
    createdAt: "2026-02-17T09:00:00.000Z",
  },
  {
    id: "exec-003",
    workflowId: "wf-002",
    workflowName: "Lead Qualifier",
    status: "success",
    mode: "webhook",
    nodeExecutions: [
      {
        id: "ne-006",
        executionId: "exec-003",
        nodeId: "n-010",
        nodeLabel: "New Lead Webhook",
        stepIndex: 0,
        status: "success",
        outputData: { body: { name: "John", email: "john@example.com", score: 85 } },
        durationMs: 5,
        retryCount: 0,
        startedAt: "2026-02-17T14:30:00.000Z",
        finishedAt: "2026-02-17T14:30:00.005Z",
      },
      {
        id: "ne-007",
        executionId: "exec-003",
        nodeId: "n-011",
        nodeLabel: "Check Lead Score",
        stepIndex: 1,
        status: "success",
        outputData: { result: true },
        durationMs: 2,
        retryCount: 0,
        startedAt: "2026-02-17T14:30:00.005Z",
        finishedAt: "2026-02-17T14:30:00.007Z",
      },
      {
        id: "ne-008",
        executionId: "exec-003",
        nodeId: "n-012",
        nodeLabel: "Notify Sales Team",
        stepIndex: 2,
        status: "success",
        branchPath: "true",
        outputData: { statusCode: 200 },
        durationMs: 180,
        retryCount: 0,
        startedAt: "2026-02-17T14:30:00.007Z",
        finishedAt: "2026-02-17T14:30:00.187Z",
      },
      {
        id: "ne-009",
        executionId: "exec-003",
        nodeId: "n-013",
        nodeLabel: "Add to Nurture Campaign",
        stepIndex: 2,
        status: "skipped",
        branchPath: "false",
        retryCount: 0,
        startedAt: "2026-02-17T14:30:00.007Z",
        finishedAt: "2026-02-17T14:30:00.007Z",
      },
    ],
    startedAt: "2026-02-17T14:30:00.000Z",
    finishedAt: "2026-02-17T14:30:00.200Z",
    durationMs: 200,
    createdAt: "2026-02-17T14:30:00.000Z",
  },
]
```

---

### Task 11: Create Mocks Index

**Files:**
- Create: `src/mocks/index.ts`

**Step 1: Write index**
```ts
export { seedUser } from "./user"
export { seedCredentials } from "./credentials"
export { seedWorkflows } from "./workflows"
export { seedExecutions } from "./executions"
```

---

### Task 12: Commit

**Step 1: Run all tests**
```bash
pnpm test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: add TypeScript types, storage helper, and seed data"
```
