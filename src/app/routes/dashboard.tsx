// src/app/routes/dashboard.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  WorkflowIcon,
  Activity,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
    { label: "Total Workflows", value: totalWorkflows, icon: WorkflowIcon },
    { label: "Active", value: activeWorkflows, icon: Activity },
    { label: "Runs Today", value: executionsToday, icon: CheckCircle },
    { label: "Success Rate", value: `${successRate}%`, icon: XCircle },
  ];

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
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your automations
          </p>
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
          icon={WorkflowIcon}
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
  );
}
