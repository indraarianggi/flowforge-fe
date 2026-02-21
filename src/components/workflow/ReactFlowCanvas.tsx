// src/components/workflow/ReactFlowCanvas.tsx
import { useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Workflow } from 'lucide-react'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { FlowControlNode } from './nodes/FlowControlNode'
import { DefaultEdge } from './edges/DefaultEdge'
import { BranchEdge } from './edges/BranchEdge'

// Defined outside the component to avoid remounting nodes on re-renders
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  flowControl: FlowControlNode,
}

const edgeTypes = {
  default: DefaultEdge,
  branch: BranchEdge,
  loop: BranchEdge, // loop edges reuse BranchEdge with loopBody handle styling
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyCanvas({ onAddTrigger }: { onAddTrigger?: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-5 text-center max-w-xs pointer-events-auto">
        {/* Icon ring */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
            <Workflow size={28} className="text-slate-400" />
          </div>
          {/* Decorative ping */}
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Start building your workflow</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Add a trigger to define when this workflow runs, then chain actions to automate your process.
          </p>
        </div>

        {onAddTrigger && (
          <button
            onClick={onAddTrigger}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 active:scale-95 transition-all duration-150 shadow-sm shadow-indigo-200"
          >
            + Add trigger
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface Props {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect?: OnConnect
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onAddTrigger?: () => void
}

export function ReactFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onAddTrigger,
}: Props) {
  const handlePaneClick = useCallback(() => {
    // Deselect on blank canvas click — consumers can subscribe via onNodeClick
  }, [])

  const isEmpty = nodes.length === 0

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={1.8}
        defaultEdgeOptions={{ type: 'default' }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-50/50"
      >
        {/* ── Background ── */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#cbd5e1"
        />

        {/* ── Controls ── */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="[&>button]:bg-white [&>button]:border-slate-200 [&>button]:shadow-sm [&>button]:rounded-lg [&>button]:text-slate-600 [&>button:hover]:bg-slate-50 [&>button:hover]:border-slate-300 [&>button:hover]:text-slate-800 !gap-1 !border-0 !bg-transparent !shadow-none"
          style={{ bottom: 24, left: 24 }}
        />

        {/* ── MiniMap ── */}
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          maskColor="rgba(148,163,184,0.12)"
          nodeColor={(node) => {
            if (node.type === 'trigger') return '#a78bfa'
            if (node.type === 'flowControl') return '#fbbf24'
            return '#60a5fa'
          }}
          className="!border !border-slate-200 !rounded-xl !shadow-sm !bg-white"
          style={{ bottom: 24, right: 24 }}
        />

        {/* ── Workflow name watermark ── */}
        <Panel position="top-left" className="pointer-events-none select-none">
          <span className="text-[10px] font-mono text-slate-300 tracking-widest uppercase">
            Canvas
          </span>
        </Panel>
      </ReactFlow>

      {/* ── Empty state overlay ── */}
      {isEmpty && <EmptyCanvas onAddTrigger={onAddTrigger} />}
    </div>
  )
}
