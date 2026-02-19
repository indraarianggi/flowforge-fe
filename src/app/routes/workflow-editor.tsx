// src/app/routes/workflow-editor.tsx
import { useEffect, useCallback, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Play, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas"
import { NodePickerModal } from "@/components/workflow/NodePickerModal"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useEditorStore } from "@/stores/editorStore"
import { useWorkflow, useUpdateWorkflow, useSaveWorkflowNodes } from "@/hooks/useWorkflows"
import { useRunWorkflow } from "@/hooks/useExecutions"
import type { WorkflowNode } from "@/types"

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState("")

  const { data: workflow, isLoading } = useWorkflow(id ?? "")
  const { mutate: updateWorkflow } = useUpdateWorkflow()
  const { mutate: saveNodes, isPending: isSaving } = useSaveWorkflowNodes()
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow()

  const {
    workflow: editorWorkflow,
    selectedNodeId,
    isPanelOpen,
    isPickerOpen,
    pickerInsertAfterNodeId,
    pickerParentNodeId,
    pickerBranchType,
    setWorkflow,
    openPanel,
    closePanel,
    openPicker,
    closePicker,
    addNode,
    deleteNode,
  } = useEditorStore()

  // Sync fetched workflow into editor store
  useEffect(() => {
    if (workflow) {
      setWorkflow(workflow)
      setWorkflowName(workflow.name)
    }
  }, [workflow, setWorkflow])

  const handleSave = useCallback(() => {
    if (!editorWorkflow) return
    saveNodes(
      { workflowId: editorWorkflow.id, nodes: editorWorkflow.nodes, nodeOrder: editorWorkflow.nodeOrder },
      { onSuccess: () => toast.success("Workflow saved") }
    )
    if (workflowName !== editorWorkflow.name) {
      updateWorkflow({ id: editorWorkflow.id, patch: { name: workflowName } })
    }
  }, [editorWorkflow, workflowName, saveNodes, updateWorkflow])

  function handleRun() {
    if (!editorWorkflow) return
    runWorkflow(editorWorkflow, {
      onSuccess: (execution) => {
        toast.success("Workflow running")
        navigate(`/executions/${execution.id}`)
      },
    })
  }

  function handleAddClick(
    insertAfterNodeId: string | null,
    parentNodeId?: string | null,
    branchType?: "true" | "false" | "body" | null
  ) {
    openPicker({ insertAfterNodeId, parentNodeId, branchType })
  }

  function handleNodeSelected(node: WorkflowNode) {
    addNode(node, pickerInsertAfterNodeId, pickerParentNodeId, pickerBranchType)
    closePicker()
  }

  if (isLoading || !editorWorkflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Loading workflow…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        {/* Editable workflow name */}
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          onBlur={() => {
            if (!workflowName.trim()) setWorkflowName(editorWorkflow.name)
          }}
          className="text-sm font-semibold text-slate-800 bg-transparent border-0 outline-none focus:bg-slate-50 focus:ring-1 focus:ring-slate-200 rounded-md px-2 py-1 flex-1 min-w-0 max-w-xs"
          placeholder="Workflow name"
        />

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs"
          >
            {isSaving
              ? <Loader2 size={13} className="mr-1.5 animate-spin" />
              : <Save size={13} className="mr-1.5" />
            }
            Save
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
          >
            {isRunning
              ? <Loader2 size={13} className="mr-1.5 animate-spin" />
              : <Play size={13} className="mr-1.5" />
            }
            Run
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto">
        <WorkflowCanvas
          nodeOrder={editorWorkflow.nodeOrder}
          nodes={editorWorkflow.nodes}
          selectedNodeId={selectedNodeId}
          onNodeClick={(nodeId) => openPanel(nodeId)}
          onNodeDelete={(nodeId) => setDeleteTarget(nodeId)}
          onAddClick={handleAddClick}
        />
      </div>

      {/* Node Picker Modal */}
      <NodePickerModal
        open={isPickerOpen}
        onClose={closePicker}
        onSelect={handleNodeSelected}
      />

      {/* Node Config Panel — wired up in Phase 8 */}
      {isPanelOpen && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Node Configuration</p>
            <button
              onClick={closePanel}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-400">Config panel coming in Phase 8</p>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this step?"
        description="This will remove the step and any child nodes inside branches or loops."
        confirmLabel="Delete step"
        onConfirm={() => {
          if (deleteTarget) deleteNode(deleteTarget)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
