# Phase 10: Execution History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Execution History page showing all past executions for a workflow, with status filtering, sortable list, and navigation to the Execution Monitor for each run.

**Architecture:** `ExecutionHistoryPage` fetches executions filtered by `workflowId` using `useExecutions(workflowId)`. A filter bar controls status and sort order. Each row is a clickable card that navigates to `/executions/:id`.

**Tech Stack:** React 18, TanStack Query, React Router 6, date-fns, shadcn/ui, Lucide React

---

### Task 1: Build ExecutionHistoryPage

**Files:**
- Create: `src/app/routes/execution-history.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the page**
```tsx
// src/app/routes/execution-history.tsx
import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, ChevronRight, Loader2, History } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useExecutions } from "@/hooks/useExecutions"
import { useWorkflow } from "@/hooks/useWorkflows"
import { cn } from "@/lib/utils"
import type { ExecutionStatus } from "@/types"

type StatusFilter = ExecutionStatus | "all"
type SortOrder = "newest" | "oldest"

export function ExecutionHistoryPage() {
  const { id: workflowId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")

  const { data: workflow } = useWorkflow(workflowId ?? "")
  const { data: executions = [], isLoading } = useExecutions(workflowId)

  const filtered = executions
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .sort((a, b) => {
      const diff = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      return sortOrder === "newest" ? diff : -diff
    })

  const successCount = executions.filter((e) => e.status === "success").length
  const failedCount = executions.filter((e) => e.status === "failed").length
  const successRate = executions.length > 0
    ? Math.round((successCount / executions.length) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-slate-400 hover:text-slate-700 mt-1 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {workflow?.name ?? "Workflow"} — Execution History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {executions.length} total runs · {successCount} succeeded · {failedCount} failed · {successRate}% success rate
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["all", "success", "failed", "running"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="w-36 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Execution list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No executions found"
          description={
            statusFilter === "all"
              ? "This workflow hasn't been run yet. Run it from the editor or dashboard."
              : `No ${statusFilter} executions for this workflow.`
          }
          action={
            statusFilter !== "all"
              ? { label: "Clear filter", onClick: () => setStatusFilter("all") }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((execution) => {
            const durationText = execution.durationMs != null
              ? execution.durationMs < 1000
                ? `${execution.durationMs}ms`
                : `${(execution.durationMs / 1000).toFixed(1)}s`
              : "—"

            return (
              <button
                key={execution.id}
                onClick={() => navigate(`/executions/${execution.id}`)}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left group"
              >
                {/* Status */}
                <StatusBadge status={execution.status} />

                {/* Timestamps */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {format(new Date(execution.startedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                    {" · "}
                    <span className="capitalize">{execution.mode}</span>
                    {" · "}
                    {execution.nodeExecutions.length} step{execution.nodeExecutions.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Duration */}
                <div className="text-xs text-slate-400 font-mono flex-shrink-0">
                  {durationText}
                </div>

                {/* Error snippet */}
                {execution.errorMessage && (
                  <div className="hidden md:block max-w-48 flex-shrink-0">
                    <p className="text-xs text-red-500 truncate">{execution.errorMessage}</p>
                  </div>
                )}

                <ChevronRight size={14} className="text-slate-400 flex-shrink-0 group-hover:text-slate-600 transition-colors" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Update router**
```tsx
import { ExecutionHistoryPage } from "./routes/execution-history"
```
And replace the stub:
```tsx
{ path: "/workflows/:id/executions", element: <ExecutionHistoryPage /> },
```

---

### Task 2: Wire Execution History Link From Dashboard

**Files:**
- Modify: `src/components/workflow/WorkflowCard.tsx`

**Step 1: Add "View history" to dropdown menu**

Import `useNavigate` and add a new dropdown item:
```tsx
import { useNavigate } from "react-router-dom"

// Inside WorkflowCard:
const navigate = useNavigate()

// Add to DropdownMenuContent (before Duplicate):
<DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}/executions`)}>
  <History size={14} className="mr-2" /> View history
</DropdownMenuItem>
```

Add `History` to the Lucide import.

---

### Task 3: Manual Verification

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Verify**
- Dashboard → workflow card "..." menu → "View history" navigates to execution history
- Execution History shows seed executions for that workflow
- Status filter buttons filter correctly (All / Success / Failed / Running)
- Sort "Oldest first" reverses the order
- Click any row → navigates to Execution Monitor for that execution
- Empty state shows when no matching executions for filter
- Success rate stat in header updates with filter (total remains fixed)

---

### Task 4: Run Tests & Commit

**Step 1: Run tests**
```bash
npm run test:run
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: execution history page with status filtering and sort"
```
