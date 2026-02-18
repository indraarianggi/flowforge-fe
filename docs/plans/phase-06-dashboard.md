# Phase 6: Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Dashboard page with stats bar, workflow card grid, and all CRUD actions (create, duplicate, toggle active, delete) with confirmation dialogs.

**Architecture:** `DashboardPage` uses `useWorkflows()` and `useExecutions()` from Phase 3. Stats are computed from the data. Workflow cards show status, last run, and actions. Empty state renders when no workflows exist. All mutations (create, toggle, delete, duplicate) update via TanStack Query cache invalidation.

**Tech Stack:** React 18, TanStack Query, React Router 6, shadcn/ui, Lucide React, date-fns, Sonner

---

### Task 1: Build StatusBadge Shared Component

**Files:**
- Create: `src/components/shared/StatusBadge.tsx`

**Step 1: Write the component**
```tsx
// src/components/shared/StatusBadge.tsx
import { cn } from "@/lib/utils"
import type { ExecutionStatus } from "@/types"

interface Props {
  status: ExecutionStatus | "active" | "inactive"
  size?: "sm" | "md"
}

const config: Record<string, { label: string; classes: string }> = {
  active:    { label: "Active",    classes: "bg-green-100 text-green-700 border-green-200" },
  inactive:  { label: "Inactive",  classes: "bg-slate-100 text-slate-500 border-slate-200" },
  running:   { label: "Running",   classes: "bg-blue-100 text-blue-700 border-blue-200" },
  success:   { label: "Success",   classes: "bg-green-100 text-green-700 border-green-200" },
  failed:    { label: "Failed",    classes: "bg-red-100 text-red-700 border-red-200" },
  cancelled: { label: "Cancelled", classes: "bg-slate-100 text-slate-500 border-slate-200" },
  waiting:   { label: "Waiting",   classes: "bg-amber-100 text-amber-700 border-amber-200" },
}

export function StatusBadge({ status, size = "sm" }: Props) {
  const { label, classes } = config[status] ?? config.inactive
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        classes
      )}
    >
      {label}
    </span>
  )
}
```

---

### Task 2: Build EmptyState Shared Component

**Files:**
- Create: `src/components/shared/EmptyState.tsx`

**Step 1: Write the component**
```tsx
// src/components/shared/EmptyState.tsx
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
```

---

### Task 3: Build ConfirmDialog Shared Component

**Files:**
- Create: `src/components/shared/ConfirmDialog.tsx`

**Step 1: Write the component**
```tsx
// src/components/shared/ConfirmDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  variant?: "destructive" | "default"
  onConfirm: () => void
  isPending?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "destructive",
  onConfirm,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 4: Build StatsBar Component

**Files:**
- Create: `src/components/shared/StatsBar.tsx`

**Step 1: Write the component**
```tsx
// src/components/shared/StatsBar.tsx
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Stat {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
}

interface Props {
  stats: Stat[]
}

export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, trend }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
              {trend && (
                <p className={cn("text-xs mt-1", trend.positive ? "text-green-600" : "text-red-500")}>
                  {trend.value}
                </p>
              )}
            </div>
            <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
              <Icon size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

### Task 5: Build WorkflowCard Component

**Files:**
- Create: `src/components/workflow/WorkflowCard.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/WorkflowCard.tsx
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  MoreHorizontal,
  Play,
  Pencil,
  Copy,
  Trash2,
  GitBranch,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import type { Workflow } from "@/types"

interface Props {
  workflow: Workflow
  executionCount: number
  onToggle: (id: string) => void
  onRun: (workflow: Workflow) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  isToggling?: boolean
}

export function WorkflowCard({
  workflow,
  executionCount,
  onToggle,
  onRun,
  onDuplicate,
  onDelete,
  isToggling,
}: Props) {
  const navigate = useNavigate()

  const triggerNode = workflow.nodes.find((n) => n.category === "trigger")
  const triggerLabel = triggerNode?.label ?? "No trigger"

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{workflow.name}</h3>
          {workflow.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch
            checked={workflow.isActive}
            onCheckedChange={() => onToggle(workflow.id)}
            disabled={isToggling}
            aria-label="Toggle workflow active"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/workflows/${workflow.id}/edit`)}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRun(workflow)}>
                <Play size={14} className="mr-2" /> Run now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
                <Copy size={14} className="mr-2" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(workflow.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Trigger info */}
      <div className="flex items-center gap-1.5 mb-3">
        <GitBranch size={12} className="text-slate-400" />
        <span className="text-xs text-slate-500">{triggerLabel}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <StatusBadge status={workflow.isActive ? "active" : "inactive"} />
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{executionCount} runs</span>
          {workflow.lastRunAt && (
            <span>
              {formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 6: Build Dashboard Page

**Files:**
- Create: `src/app/routes/dashboard.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the Dashboard page**
```tsx
// src/app/routes/dashboard.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Workflow, Activity, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StatsBar } from "@/components/shared/StatsBar"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { WorkflowCard } from "@/components/workflow/WorkflowCard"
import {
  useWorkflows,
  useCreateWorkflow,
  useDeleteWorkflow,
  useToggleWorkflow,
  useDuplicateWorkflow,
} from "@/hooks/useWorkflows"
import { useExecutions, useRunWorkflow } from "@/hooks/useExecutions"
import type { Workflow } from "@/types"

export function DashboardPage() {
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: workflows = [], isLoading } = useWorkflows()
  const { data: executions = [] } = useExecutions()

  const { mutate: createWorkflow, isPending: isCreating } = useCreateWorkflow()
  const { mutate: deleteWorkflow, isPending: isDeleting } = useDeleteWorkflow()
  const { mutate: toggleWorkflow, isPending: isToggling } = useToggleWorkflow()
  const { mutate: duplicateWorkflow } = useDuplicateWorkflow()
  const { mutate: runWorkflow } = useRunWorkflow()

  // Stats
  const totalWorkflows = workflows.length
  const activeWorkflows = workflows.filter((w) => w.isActive).length
  const today = new Date().toDateString()
  const executionsToday = executions.filter(
    (e) => new Date(e.createdAt).toDateString() === today
  ).length
  const successRate =
    executions.length > 0
      ? Math.round((executions.filter((e) => e.status === "success").length / executions.length) * 100)
      : 0

  const stats = [
    { label: "Total Workflows", value: totalWorkflows, icon: Workflow },
    { label: "Active", value: activeWorkflows, icon: Activity },
    { label: "Runs Today", value: executionsToday, icon: CheckCircle },
    { label: "Success Rate", value: `${successRate}%`, icon: XCircle },
  ]

  function handleCreate() {
    createWorkflow(
      { name: "Untitled Workflow" },
      {
        onSuccess: (workflow) => {
          navigate(`/workflows/${workflow.id}/edit`)
        },
        onError: () => toast.error("Failed to create workflow"),
      }
    )
  }

  function handleDelete(id: string) {
    deleteWorkflow(id, {
      onSuccess: () => {
        toast.success("Workflow deleted")
        setDeleteTarget(null)
      },
      onError: () => toast.error("Failed to delete workflow"),
    })
  }

  function handleRun(workflow: Workflow) {
    runWorkflow(workflow, {
      onSuccess: (execution) => {
        toast.success("Workflow started")
        navigate(`/executions/${execution.id}`)
      },
    })
  }

  function handleDuplicate(id: string) {
    duplicateWorkflow(id, {
      onSuccess: () => toast.success("Workflow duplicated"),
      onError: () => toast.error("Failed to duplicate workflow"),
    })
  }

  function getExecutionCount(workflowId: string) {
    return executions.filter((e) => e.workflowId === workflowId).length
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your automations</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating}>
          <Plus size={16} className="mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsBar stats={stats} />
      </div>

      {/* Workflows */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Workflows ({totalWorkflows})
        </h2>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description="Create your first workflow to start automating repetitive tasks."
          action={{ label: "Create workflow", onClick: handleCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              executionCount={getExecutionCount(workflow.id)}
              onToggle={(id) => toggleWorkflow(id)}
              onRun={handleRun}
              onDuplicate={handleDuplicate}
              onDelete={(id) => setDeleteTarget(id)}
              isToggling={isToggling}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete workflow?"
        description="This will permanently delete the workflow and all its execution history. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        isPending={isDeleting}
      />
    </div>
  )
}
```

**Step 2: Replace stub in `src/app/router.tsx`**
```tsx
import { DashboardPage } from "./routes/dashboard"
```
And update:
```tsx
{ path: "/dashboard", element: <DashboardPage /> },
```

---

### Task 7: Manual Verification

**Step 1: Start dev server**
```bash
pnpm dev
```

**Step 2: Verify**
- Login and land on dashboard → see 4 stat cards and 3 seed workflow cards
- Toggle a workflow's active switch → badge updates immediately
- Click "..." menu → Edit navigates to editor, Run navigates to monitor
- Duplicate → new card appears in grid
- Delete → confirm dialog appears, on confirm card disappears
- Click "New Workflow" → navigates to `/workflows/{id}/edit`
- Delete all workflows → empty state with "Create workflow" CTA appears

---

### Task 8: Run Tests & Commit

**Step 1: Run tests**
```bash
pnpm test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: add dashboard with stats, workflow cards, and CRUD actions"
```
