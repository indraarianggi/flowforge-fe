// src/app/routes/workflow-editor.tsx
import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Play, Loader2, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { ReactFlowProvider } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { ReactFlowCanvas } from '@/components/workflow/ReactFlowCanvas'
import { NodePickerModal } from '@/components/workflow/NodePickerModal'
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useEditorStore } from '@/stores/editorStore'
import { useWorkflow, useUpdateWorkflow, useSaveWorkflowNodes } from '@/hooks/useWorkflows'
import { useRunWorkflowWithSimulation } from '@/hooks/useExecutions'
import type { WorkflowNode } from '@/types'
import type { Node, Connection } from '@xyflow/react'

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [workflowName, setWorkflowName] = useState('')

  const { data: workflow, isLoading } = useWorkflow(id ?? '')
  const { mutate: updateWorkflow } = useUpdateWorkflow()
  const { mutate: saveNodes, isPending: isSaving } = useSaveWorkflowNodes()
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflowWithSimulation()

  const {
    workflow: editorWorkflow,
    rfNodes,
    rfEdges,
    onNodesChange,
    onEdgesChange,
    selectedNodeId,
    isPanelOpen,
    isPickerOpen,
    pickerContext,
    loadWorkflow,
    selectNode,
    closePanel,
    openPicker,
    closePicker,
    addNode,
    deleteNode,
    addEdge,
    runAutoLayout,
  } = useEditorStore()

  // Sync fetched workflow into editor store
  useEffect(() => {
    if (workflow) {
      loadWorkflow(workflow)
      setWorkflowName(workflow.name)
    }
  }, [workflow, loadWorkflow])

  const handleSave = useCallback(() => {
    if (!editorWorkflow) return
    // Sync RF positions back to workflow before saving
    useEditorStore.getState().syncWorkflowFromRF()
    const wf = useEditorStore.getState().workflow!
    saveNodes(
      { workflowId: wf.id, nodes: wf.nodes, edges: wf.edges },
      { onSuccess: () => toast.success('Workflow saved') }
    )
    if (workflowName !== wf.name) {
      updateWorkflow({ id: wf.id, patch: { name: workflowName } })
    }
  }, [editorWorkflow, workflowName, saveNodes, updateWorkflow])

  function handleRun() {
    if (!editorWorkflow) return
    runWorkflow(editorWorkflow, {
      onSuccess: (execution) => {
        toast.success('Workflow running')
        navigate(`/executions/${execution.id}`)
      },
    })
  }

  function handleNodeClick(_event: React.MouseEvent, node: Node) {
    selectNode(node.id)
  }

  function handleAddTrigger() {
    openPicker({})
  }

  const handleConnect = useCallback(
    (connection: Connection) => addEdge(connection),
    [addEdge]
  )

  function handleNodeSelected(node: WorkflowNode) {
    if (!pickerContext) return
    addNode(node, pickerContext)
    closePicker()
  }

  if (isLoading || !editorWorkflow) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400">Loading workflow...</p>
        </div>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-slate-50">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

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
              onClick={runAutoLayout}
              className="h-8 text-xs"
            >
              <LayoutGrid size={13} className="mr-1.5" />
              Auto Layout
            </Button>
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
        <div className="flex-1">
          <ReactFlowCanvas
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onAddTrigger={handleAddTrigger}
          />
        </div>

        {/* Node Picker Modal */}
        <NodePickerModal
          open={isPickerOpen}
          onClose={closePicker}
          onSelect={handleNodeSelected}
        />

        {/* Node Config Panel */}
        {isPanelOpen && selectedNodeId && (() => {
          const selectedNode = editorWorkflow.nodes.find((n) => n.id === selectedNodeId)
          return selectedNode ? (
            <NodeConfigPanel
              open={isPanelOpen}
              onClose={closePanel}
              node={selectedNode}
              nodes={editorWorkflow.nodes}
              edges={editorWorkflow.edges}
            />
          ) : null
        })()}

        {/* Delete confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete this step?"
          description="This will remove the step and reconnect surrounding edges."
          confirmLabel="Delete step"
          onConfirm={() => {
            if (deleteTarget) deleteNode(deleteTarget)
            setDeleteTarget(null)
          }}
        />
      </div>
    </ReactFlowProvider>
  )
}
