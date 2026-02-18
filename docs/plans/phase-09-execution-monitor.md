# Phase 9: Execution Monitor & Simulated Real-Time Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Execution Monitor page with a per-node timeline, expandable JSON input/output viewer, and simulated real-time node progression driven by `setTimeout` sequences in Zustand.

**Architecture:** `executionStore` (Zustand) holds live execution state during a run. The `simulateExecution()` function in `executionService` fires sequential `setTimeout` callbacks that dispatch store updates — the UI re-renders reactively. When viewing a past (completed) execution, state is loaded from localStorage directly. The page works for both live runs and historical views.

**Tech Stack:** Zustand 4, TanStack Query, React 18, shadcn/ui, Lucide React, date-fns

---

### Task 1: Build executionStore

**Files:**
- Create: `src/stores/executionStore.ts`

**Step 1: Write the store**
```ts
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
```

---

### Task 2: Update useRunWorkflow Hook to Start Simulation

**Files:**
- Modify: `src/hooks/useExecutions.ts`

**Step 1: Export a hook that starts simulation after creating execution**
```ts
// Add to src/hooks/useExecutions.ts
import { useExecutionStore } from "@/stores/executionStore"
import { executionService } from "@/services/executionService"

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
```

---

### Task 3: Build JsonViewer Component

**Files:**
- Create: `src/components/shared/JsonViewer.tsx`

**Step 1: Write the component**
```tsx
// src/components/shared/JsonViewer.tsx
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  data: unknown
  defaultExpanded?: boolean
  maxHeight?: string
}

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1)

  if (value === null) return <span className="text-slate-400">null</span>
  if (typeof value === "boolean") return <span className="text-blue-400">{String(value)}</span>
  if (typeof value === "number") return <span className="text-green-400">{value}</span>
  if (typeof value === "string") return <span className="text-amber-300">"{value}"</span>

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400">[]</span>
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white inline-flex items-center"
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          <span className="text-slate-400 ml-0.5">[{value.length}]</span>
        </button>
        {!collapsed && (
          <div className={cn("ml-4 border-l border-slate-700 pl-2")}>
            {value.map((item, idx) => (
              <div key={idx} className="my-0.5">
                <span className="text-slate-500">{idx}: </span>
                <JsonNode value={item} depth={depth + 1} />
                {idx < value.length - 1 && <span className="text-slate-600">,</span>}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-slate-400">{"{}"}</span>
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white inline-flex items-center"
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          <span className="text-slate-400 ml-0.5">{"{"}{entries.length}{"}"}</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-slate-700 pl-2">
            {entries.map(([key, val], idx) => (
              <div key={key} className="my-0.5">
                <span className="text-blue-300">"{key}"</span>
                <span className="text-slate-500">: </span>
                <JsonNode value={val} depth={depth + 1} />
                {idx < entries.length - 1 && <span className="text-slate-600">,</span>}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-slate-300">{String(value)}</span>
}

export function JsonViewer({ data, defaultExpanded = true, maxHeight = "200px" }: Props) {
  return (
    <div
      className="bg-slate-900 rounded-lg p-3 overflow-auto font-mono text-xs leading-relaxed"
      style={{ maxHeight }}
    >
      <JsonNode value={data} depth={0} />
    </div>
  )
}
```

---

### Task 4: Build NodeExecutionRow Component

**Files:**
- Create: `src/components/execution/NodeExecutionRow.tsx`

**Step 1: Write the component**
```tsx
// src/components/execution/NodeExecutionRow.tsx
import { useState } from "react"
import {
  CheckCircle2, XCircle, Loader2, Clock, ChevronDown, ChevronRight, MinusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { JsonViewer } from "@/components/shared/JsonViewer"
import type { NodeExecution } from "@/types"

function StatusIcon({ status }: { status: NodeExecution["status"] }) {
  switch (status) {
    case "success": return <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
    case "failed":  return <XCircle size={16} className="text-red-500 flex-shrink-0" />
    case "running": return <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />
    case "skipped": return <MinusCircle size={16} className="text-slate-400 flex-shrink-0" />
    default:        return <Clock size={16} className="text-slate-300 flex-shrink-0" />
  }
}

interface Props {
  nodeExecution: NodeExecution
  isLast?: boolean
}

export function NodeExecutionRow({ nodeExecution, isLast }: Props) {
  const [expanded, setExpanded] = useState(nodeExecution.status === "failed")

  const borderClass = {
    success: "border-green-200 bg-green-50/50",
    failed:  "border-red-200 bg-red-50/50",
    running: "border-blue-200 bg-blue-50/50",
    skipped: "border-slate-200 bg-slate-50",
    pending: "border-slate-200 bg-white",
  }[nodeExecution.status]

  const durationText = nodeExecution.durationMs != null
    ? nodeExecution.durationMs < 1000
      ? `${nodeExecution.durationMs}ms`
      : `${(nodeExecution.durationMs / 1000).toFixed(2)}s`
    : null

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-12 w-px h-full bg-slate-200 -z-10" />
      )}

      <div className={cn("rounded-xl border p-4 transition-all", borderClass)}>
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3"
        >
          <StatusIcon status={nodeExecution.status} />

          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Step {nodeExecution.stepIndex + 1}</span>
              {nodeExecution.branchPath && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded font-medium",
                  nodeExecution.branchPath === "true"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {nodeExecution.branchPath} branch
                </span>
              )}
              {nodeExecution.loopIteration != null && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  Iteration {nodeExecution.loopIteration + 1}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">{nodeExecution.nodeLabel}</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
            {durationText && <span>{durationText}</span>}
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Error message */}
            {nodeExecution.errorMessage && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
                <p className="text-xs text-red-600">{nodeExecution.errorMessage}</p>
                <p className="text-xs text-red-500 mt-2">
                  💡 Suggested fix: Check the URL, credentials, and input data format.
                </p>
              </div>
            )}

            {/* Skipped message */}
            {nodeExecution.status === "skipped" && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">
                  This step was skipped because the condition routed execution to a different branch.
                </p>
              </div>
            )}

            {/* Input data */}
            {nodeExecution.inputData && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">Input</p>
                <JsonViewer data={nodeExecution.inputData} />
              </div>
            )}

            {/* Output data */}
            {nodeExecution.outputData && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">Output</p>
                <JsonViewer data={nodeExecution.outputData} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Task 5: Build ExecutionMonitor Page

**Files:**
- Create: `src/app/routes/execution-monitor.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the page**
```tsx
// src/app/routes/execution-monitor.tsx
import { useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { NodeExecutionRow } from "@/components/execution/NodeExecutionRow"
import { useExecution } from "@/hooks/useExecutions"
import { useExecutionStore } from "@/stores/executionStore"
import type { Execution } from "@/types"

export function ExecutionMonitorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: storedExecution, isLoading } = useExecution(id ?? "")
  const { liveExecution, isSimulating } = useExecutionStore()

  // Use live execution if it matches this ID, otherwise use stored
  const execution: Execution | null =
    liveExecution?.id === id ? liveExecution : storedExecution ?? null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Execution not found.</p>
        <Button variant="link" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  const durationText = execution.durationMs != null
    ? execution.durationMs < 1000
      ? `${execution.durationMs}ms`
      : `${(execution.durationMs / 1000).toFixed(1)}s`
    : isSimulating && liveExecution?.id === id
    ? "Running…"
    : "—"

  const isLive = isSimulating && liveExecution?.id === id

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700 mt-1 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-slate-900">{execution.workflowName}</h1>
            <StatusBadge status={execution.status} size="md" />
            {isLive && (
              <div className="flex items-center gap-1.5 text-blue-600 text-xs font-medium">
                <RefreshCw size={11} className="animate-spin" />
                Live
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>
              Started {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
            </span>
            <span>•</span>
            <span>Duration: {durationText}</span>
            <span>•</span>
            <span className="capitalize">{execution.mode} trigger</span>
          </div>
        </div>
      </div>

      {/* Error summary */}
      {execution.status === "failed" && execution.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
          <p className="text-sm font-semibold text-red-800 mb-1">Execution failed</p>
          <p className="text-sm text-red-600">{execution.errorMessage}</p>
        </div>
      )}

      {/* Node execution timeline */}
      <div className="space-y-3">
        {execution.nodeExecutions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <Loader2 size={20} className="animate-spin mx-auto mb-3" />
            Waiting for execution to start…
          </div>
        ) : (
          execution.nodeExecutions.map((ne, idx) => (
            <NodeExecutionRow
              key={ne.id}
              nodeExecution={ne}
              isLast={idx === execution.nodeExecutions.length - 1}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {execution.status !== "running" && (
        <div className="mt-8 pt-4 border-t border-slate-200">
          <Link
            to={`/workflows/${execution.workflowId}/executions`}
            className="text-sm text-primary hover:underline"
          >
            View all executions for this workflow →
          </Link>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Update router**
```tsx
import { ExecutionMonitorPage } from "./routes/execution-monitor"
```
And replace the stub:
```tsx
{ path: "/executions/:id", element: <ExecutionMonitorPage /> },
```

---

### Task 6: Wire Up Run From Editor To Use Simulation

**Files:**
- Modify: `src/app/routes/workflow-editor.tsx`

**Step 1: Replace `useRunWorkflow` with `useRunWorkflowWithSimulation`**
```tsx
import { useRunWorkflowWithSimulation } from "@/hooks/useExecutions"
// Replace:
const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow()
// With:
const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflowWithSimulation()
```

---

### Task 7: Manual Verification

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Test live execution**
- Open any workflow in the editor
- Click "Run" → navigates to Execution Monitor
- Watch nodes go from pending → running (spinner) → success (green) one by one
- "Live" badge visible during simulation
- On completion, all nodes green, duration shown

**Step 3: Test failed execution**
- Run a workflow — if the 10% random failure triggers:
  - Failed node shows red XCircle
  - Error message expands automatically
  - "Suggested fix" hint shown
  - Subsequent nodes remain pending/skipped

**Step 4: Test historical execution**
- Click any seed execution from the dashboard "..." → view executions
- Navigate to `/executions/exec-002` (failed seed) → shows failed state correctly
- JsonViewer: click `{N}` to collapse/expand nested objects

---

### Task 8: Run Tests & Commit

**Step 1: Run tests**
```bash
npm run test:run
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: execution monitor with simulated real-time node progression"
```
