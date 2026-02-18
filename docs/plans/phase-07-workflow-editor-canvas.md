# Phase 7: Workflow Editor — Canvas, Node Cards & Node Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the workflow editor canvas with the top bar, vertical node list, node cards (all states), the Node Picker modal (2-step), branch visualization for IF nodes, and the Loop container — without the Node Config panel (Phase 8).

**Architecture:** `editorStore` (Zustand) holds canvas state: active workflow nodes, selected node id, panel open state. The canvas renders nodes recursively to support IF branches and Loop bodies. Clicking a node opens the config panel (stub for now). The "+" button opens the Node Picker modal. All changes are saved via `useSaveWorkflowNodes`.

**Tech Stack:** Zustand 4, TanStack Query, React Router 6, shadcn/ui, Lucide React, Tailwind CSS

---

### Task 1: Build editorStore

**Files:**
- Create: `src/stores/editorStore.ts`

**Step 1: Write the store**
```ts
// src/stores/editorStore.ts
import { create } from "zustand"
import type { Workflow, WorkflowNode } from "@/types"

interface EditorState {
  workflow: Workflow | null
  selectedNodeId: string | null
  isPanelOpen: boolean
  isPickerOpen: boolean
  pickerInsertAfterNodeId: string | null // null = append to top-level
  pickerParentNodeId: string | null       // for inserting into branch/loop
  pickerBranchType: "true" | "false" | "body" | null

  // Actions
  setWorkflow: (workflow: Workflow) => void
  selectNode: (nodeId: string | null) => void
  openPanel: (nodeId: string) => void
  closePanel: () => void
  openPicker: (opts: {
    insertAfterNodeId: string | null
    parentNodeId?: string | null
    branchType?: "true" | "false" | "body" | null
  }) => void
  closePicker: () => void
  updateNodeConfig: (nodeId: string, config: WorkflowNode["config"]) => void
  updateNodeStatus: (nodeId: string, status: WorkflowNode["status"]) => void
  addNode: (node: WorkflowNode, insertAfterNodeId: string | null, parentNodeId?: string | null, branchType?: "true" | "false" | "body" | null) => void
  deleteNode: (nodeId: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workflow: null,
  selectedNodeId: null,
  isPanelOpen: false,
  isPickerOpen: false,
  pickerInsertAfterNodeId: null,
  pickerParentNodeId: null,
  pickerBranchType: null,

  setWorkflow: (workflow) => set({ workflow }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  openPanel: (nodeId) => set({ selectedNodeId: nodeId, isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false, selectedNodeId: null }),

  openPicker: ({ insertAfterNodeId, parentNodeId = null, branchType = null }) =>
    set({
      isPickerOpen: true,
      pickerInsertAfterNodeId: insertAfterNodeId,
      pickerParentNodeId: parentNodeId,
      pickerBranchType: branchType,
    }),

  closePicker: () =>
    set({
      isPickerOpen: false,
      pickerInsertAfterNodeId: null,
      pickerParentNodeId: null,
      pickerBranchType: null,
    }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      if (!state.workflow) return state
      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, config } : n
          ),
        },
      }
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => {
      if (!state.workflow) return state
      return {
        workflow: {
          ...state.workflow,
          nodes: state.workflow.nodes.map((n) =>
            n.id === nodeId ? { ...n, status } : n
          ),
        },
      }
    }),

  addNode: (node, insertAfterNodeId, parentNodeId, branchType) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Top-level insertion
      if (!parentNodeId) {
        const order = [...wf.nodeOrder]
        const insertIdx = insertAfterNodeId
          ? order.indexOf(insertAfterNodeId) + 1
          : order.length
        order.splice(insertIdx, 0, node.id)
        return {
          workflow: {
            ...wf,
            nodes: [...wf.nodes, node],
            nodeOrder: order,
          },
        }
      }

      // Inserting into a branch or loop body
      const nodes = wf.nodes.map((n) => {
        if (n.id !== parentNodeId) return n
        if (branchType === "true") {
          const ids = [...(n.trueBranchNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, trueBranchNodeIds: ids }
        }
        if (branchType === "false") {
          const ids = [...(n.falseBranchNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, falseBranchNodeIds: ids }
        }
        if (branchType === "body") {
          const ids = [...(n.bodyNodeIds ?? [])]
          const idx = insertAfterNodeId ? ids.indexOf(insertAfterNodeId) + 1 : ids.length
          ids.splice(idx, 0, node.id)
          return { ...n, bodyNodeIds: ids }
        }
        return n
      })

      return {
        workflow: {
          ...wf,
          nodes: [...nodes, { ...node, parentId: parentNodeId, branchType: branchType ?? undefined }],
        },
      }
    }),

  deleteNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Remove from nodes array and from all id lists
      const nodes = wf.nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          trueBranchNodeIds: n.trueBranchNodeIds?.filter((id) => id !== nodeId),
          falseBranchNodeIds: n.falseBranchNodeIds?.filter((id) => id !== nodeId),
          bodyNodeIds: n.bodyNodeIds?.filter((id) => id !== nodeId),
        }))

      return {
        workflow: {
          ...wf,
          nodes,
          nodeOrder: wf.nodeOrder.filter((id) => id !== nodeId),
        },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isPanelOpen: state.selectedNodeId === nodeId ? false : state.isPanelOpen,
      }
    }),
}))
```

---

### Task 2: Build Node Type Metadata

**Files:**
- Create: `src/components/workflow/nodeTypes.ts`

**Step 1: Write the metadata**
```ts
// src/components/workflow/nodeTypes.ts
import type { NodeType, NodeCategory } from "@/types"

export interface NodeTypeMeta {
  type: NodeType
  label: string
  description: string
  category: NodeCategory
  icon: string // emoji or identifier
  color: string // Tailwind bg class
}

export const NODE_TYPE_META: NodeTypeMeta[] = [
  // Triggers
  { type: "manual_trigger",   label: "Manual Trigger",     description: "Start this workflow manually",                     category: "trigger",      icon: "▶", color: "bg-purple-100 text-purple-700" },
  { type: "webhook_trigger",  label: "Webhook",            description: "Trigger on incoming HTTP request",                 category: "trigger",      icon: "🌐", color: "bg-purple-100 text-purple-700" },
  { type: "schedule_trigger", label: "Schedule / Cron",    description: "Run on a time-based schedule",                     category: "trigger",      icon: "🕐", color: "bg-purple-100 text-purple-700" },
  { type: "telegram_trigger", label: "Telegram — Message", description: "Trigger when your Telegram bot gets a message",    category: "integration",  icon: "✈", color: "bg-sky-100 text-sky-700" },

  // Actions
  { type: "http_request",     label: "HTTP Request",       description: "Make a request to any API endpoint",               category: "action",       icon: "⚡", color: "bg-blue-100 text-blue-700" },
  { type: "set_transform",    label: "Set / Transform",    description: "Create or transform data fields",                   category: "action",       icon: "✏", color: "bg-blue-100 text-blue-700" },
  { type: "code",             label: "Code",               description: "Run custom JavaScript in a sandbox",               category: "action",       icon: "{}",color: "bg-blue-100 text-blue-700" },

  // Flow Control
  { type: "if_condition",     label: "IF / Condition",     description: "Branch the flow based on conditions",              category: "flow_control", icon: "⑂", color: "bg-amber-100 text-amber-700" },
  { type: "loop",             label: "Loop",               description: "Iterate over a list or repeat N times",            category: "flow_control", icon: "↻", color: "bg-blue-100 text-blue-700" },
  { type: "wait",             label: "Wait",               description: "Pause execution for a duration",                   category: "flow_control", icon: "⏸", color: "bg-blue-100 text-blue-700" },
  { type: "merge",            label: "Merge",              description: "Combine outputs from parallel branches",           category: "flow_control", icon: "⑁", color: "bg-blue-100 text-blue-700" },

  // Integrations
  { type: "telegram_send_message", label: "Telegram — Send Message", description: "Send a message via your Telegram bot",  category: "integration",  icon: "✈", color: "bg-sky-100 text-sky-700" },
  { type: "google_sheets_append",  label: "Google Sheets — Append",  description: "Append a row to a Google Sheet",        category: "integration",  icon: "📊", color: "bg-green-100 text-green-700" },
  { type: "google_sheets_read",    label: "Google Sheets — Read",    description: "Read rows from a Google Sheet",         category: "integration",  icon: "📊", color: "bg-green-100 text-green-700" },
]

export function getNodeMeta(type: NodeType): NodeTypeMeta {
  return NODE_TYPE_META.find((m) => m.type === type) ?? NODE_TYPE_META[0]
}

export const defaultConfig: Record<NodeType, object> = {
  manual_trigger:        { sampleData: "" },
  webhook_trigger:       { path: `wh-${Math.random().toString(36).slice(2,10)}`, method: "POST", responseMode: "immediately" },
  schedule_trigger:      { preset: "daily", timezone: "UTC" },
  telegram_trigger:      { credentialId: "" },
  http_request:          { url: "", method: "GET", headers: [], queryParams: [], bodyType: "json", authType: "none", timeout: 5000 },
  if_condition:          { combinator: "AND", conditions: [{ id: `c-${Date.now()}`, field: "", operation: "equals", value: "" }] },
  set_transform:         { fields: [{ id: `f-${Date.now()}`, name: "", value: "" }] },
  code:                  { code: "// Return the output data\nreturn $input", inputMappings: [] },
  loop:                  { mode: "forEach", source: "", batchSize: 1, onItemError: "stopAll" },
  wait:                  { mode: "duration", durationValue: 5, durationUnit: "minutes" },
  merge:                 { strategy: "append" },
  telegram_send_message: { credentialId: "" },
  google_sheets_append:  { credentialId: "" },
  google_sheets_read:    { credentialId: "" },
}
```

---

### Task 3: Build AddButton Component

**Files:**
- Create: `src/components/workflow/AddButton.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/AddButton.tsx
import { Plus } from "lucide-react"

interface Props {
  onClick: () => void
  label?: string
}

export function AddButton({ onClick, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-0.5 my-1">
      <div className="w-px h-4 bg-slate-300" />
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-slate-300 bg-white text-slate-500 text-xs font-medium hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors group"
      >
        <Plus size={12} className="group-hover:rotate-90 transition-transform duration-200" />
        {label ?? "Add step"}
      </button>
      <div className="w-px h-4 bg-slate-300" />
    </div>
  )
}
```

---

### Task 4: Build NodeCard Component

**Files:**
- Create: `src/components/workflow/NodeCard.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/NodeCard.tsx
import { CheckCircle2, AlertCircle, XCircle, Minus, MoreHorizontal, Trash2, Copy } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getNodeMeta } from "./nodeTypes"
import type { WorkflowNode } from "@/types"

interface Props {
  node: WorkflowNode
  stepNumber: string
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

function StatusIcon({ status }: { status: WorkflowNode["status"] }) {
  if (status === "tested")      return <CheckCircle2 size={14} className="text-green-500" />
  if (status === "configured")  return <Minus size={14} className="text-amber-400" />
  if (status === "error")       return <XCircle size={14} className="text-red-500" />
  return <AlertCircle size={14} className="text-slate-300" />
}

export function NodeCard({ node, stepNumber, isSelected, onClick, onDelete }: Props) {
  const meta = getNodeMeta(node.type)

  const borderClass = {
    trigger:      "border-l-purple-400",
    action:       "border-l-transparent",
    flow_control: "border-l-blue-400",
    integration:  "border-l-sky-400",
  }[node.category]

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 border-l-4 p-4 cursor-pointer group",
        "hover:shadow-md hover:border-slate-300 transition-all",
        isSelected && "border-slate-300 shadow-md ring-2 ring-primary/20",
        borderClass
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0", meta.color)}>
          {meta.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{stepNumber}</span>
            <span className="text-xs font-medium text-slate-500">{meta.label}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{node.label}</p>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusIcon status={node.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 size={14} className="mr-2" /> Delete step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 5: Build BranchContainer Component

**Files:**
- Create: `src/components/workflow/BranchContainer.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/BranchContainer.tsx
import { CheckCircle2, XCircle } from "lucide-react"
import type { WorkflowNode } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"

interface BranchProps {
  label: "true" | "false"
  nodeIds: string[]
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  parentNodeId: string
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "true" | "false") => void
  getStepNumber: (nodeId: string) => string
}

function Branch({
  label,
  nodeIds,
  allNodes,
  selectedNodeId,
  parentNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: BranchProps) {
  const nodes = nodeIds.map((id) => allNodes.find((n) => n.id === id)).filter(Boolean) as WorkflowNode[]
  const isTrue = label === "true"

  return (
    <div className="flex-1 min-w-0">
      {/* Branch label */}
      <div className={`flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg w-fit ${
        isTrue ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
      }`}>
        {isTrue
          ? <CheckCircle2 size={13} />
          : <XCircle size={13} />
        }
        <span className="text-xs font-semibold">{isTrue ? "True" : "False"}</span>
      </div>

      {/* Nodes */}
      <div className="flex flex-col gap-0">
        {nodes.map((node, idx) => (
          <div key={node.id}>
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
            <AddButton
              onClick={() => onAddClick(node.id, parentNodeId, label)}
            />
          </div>
        ))}
        {nodes.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">No steps in this branch</p>
          </div>
        )}
        <AddButton
          onClick={() =>
            onAddClick(nodes[nodes.length - 1]?.id ?? null, parentNodeId, label)
          }
          label="Add to branch"
        />
      </div>
    </div>
  )
}

interface Props {
  ifNode: WorkflowNode
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "true" | "false") => void
  getStepNumber: (nodeId: string) => string
}

export function BranchContainer({
  ifNode,
  allNodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: Props) {
  return (
    <div className="bg-[#fafafa] border border-slate-200 rounded-xl p-4">
      <div className="flex gap-4">
        <Branch
          label="true"
          nodeIds={ifNode.trueBranchNodeIds ?? []}
          allNodes={allNodes}
          selectedNodeId={selectedNodeId}
          parentNodeId={ifNode.id}
          onNodeClick={onNodeClick}
          onNodeDelete={onNodeDelete}
          onAddClick={onAddClick}
          getStepNumber={getStepNumber}
        />
        <div className="w-px bg-slate-200 flex-shrink-0" />
        <Branch
          label="false"
          nodeIds={ifNode.falseBranchNodeIds ?? []}
          allNodes={allNodes}
          selectedNodeId={selectedNodeId}
          parentNodeId={ifNode.id}
          onNodeClick={onNodeClick}
          onNodeDelete={onNodeDelete}
          onAddClick={onAddClick}
          getStepNumber={getStepNumber}
        />
      </div>
    </div>
  )
}
```

---

### Task 6: Build LoopContainer Component

**Files:**
- Create: `src/components/workflow/LoopContainer.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/LoopContainer.tsx
import { RefreshCw } from "lucide-react"
import type { WorkflowNode, LoopConfig } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"

interface Props {
  loopNode: WorkflowNode
  allNodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId: string, branchType: "body") => void
  getStepNumber: (nodeId: string) => string
}

export function LoopContainer({
  loopNode,
  allNodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
  getStepNumber,
}: Props) {
  const config = loopNode.config as LoopConfig
  const bodyNodes = (loopNode.bodyNodeIds ?? [])
    .map((id) => allNodes.find((n) => n.id === id))
    .filter(Boolean) as WorkflowNode[]

  const summaryText =
    config.mode === "forEach"
      ? `For each item in ${config.source || "…"}`
      : `Repeat ${config.count || "N"} times`

  return (
    <div className="bg-[#f0f7ff] border border-blue-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
        <RefreshCw size={13} className="text-blue-500" />
        <span className="text-xs font-semibold text-blue-700">{summaryText}</span>
      </div>

      {/* Body nodes */}
      <div className="p-4 flex flex-col gap-0">
        {bodyNodes.map((node) => (
          <div key={node.id}>
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
            <AddButton
              onClick={() => onAddClick(node.id, loopNode.id, "body")}
            />
          </div>
        ))}
        {bodyNodes.length === 0 && (
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center mb-2">
            <p className="text-xs text-blue-400">No steps in loop body</p>
          </div>
        )}
        <AddButton
          onClick={() =>
            onAddClick(bodyNodes[bodyNodes.length - 1]?.id ?? null, loopNode.id, "body")
          }
          label="Add to loop"
        />
      </div>
    </div>
  )
}
```

---

### Task 7: Build WorkflowCanvas Component

**Files:**
- Create: `src/components/workflow/WorkflowCanvas.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/WorkflowCanvas.tsx
import type { WorkflowNode } from "@/types"
import { NodeCard } from "./NodeCard"
import { AddButton } from "./AddButton"
import { BranchContainer } from "./BranchContainer"
import { LoopContainer } from "./LoopContainer"

interface Props {
  nodeOrder: string[]
  nodes: WorkflowNode[]
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDelete: (nodeId: string) => void
  onAddClick: (insertAfterNodeId: string | null, parentNodeId?: string | null, branchType?: "true" | "false" | "body" | null) => void
}

export function WorkflowCanvas({
  nodeOrder,
  nodes,
  selectedNodeId,
  onNodeClick,
  onNodeDelete,
  onAddClick,
}: Props) {
  const topLevelNodes = nodeOrder
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean) as WorkflowNode[]

  // Step numbering: top-level nodes get 1, 2, 3...
  // Branch nodes get 3a.1, 3a.2 / 3b.1, 3b.2
  // Loop body nodes get 3.1, 3.2
  function getStepNumber(nodeId: string): string {
    const topIdx = nodeOrder.indexOf(nodeId)
    if (topIdx !== -1) return String(topIdx + 1)

    for (const node of nodes) {
      const trueIdx = node.trueBranchNodeIds?.indexOf(nodeId) ?? -1
      if (trueIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}a.${trueIdx + 1}`
      }
      const falseIdx = node.falseBranchNodeIds?.indexOf(nodeId) ?? -1
      if (falseIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}b.${falseIdx + 1}`
      }
      const bodyIdx = node.bodyNodeIds?.indexOf(nodeId) ?? -1
      if (bodyIdx !== -1) {
        const parentIdx = nodeOrder.indexOf(node.id) + 1
        return `${parentIdx}.${bodyIdx + 1}`
      }
    }
    return "?"
  }

  if (topLevelNodes.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center max-w-sm">
          <p className="text-slate-500 text-sm mb-4">No steps yet. Add a trigger to get started.</p>
          <AddButton onClick={() => onAddClick(null)} label="Add trigger" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0 w-full max-w-2xl mx-auto py-8 px-4">
      <AddButton onClick={() => onAddClick(null)} label="Add trigger" />
      {topLevelNodes.map((node, idx) => (
        <div key={node.id} className="w-full flex flex-col items-center gap-0">
          <div className="w-full">
            <NodeCard
              node={node}
              stepNumber={getStepNumber(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={() => onNodeClick(node.id)}
              onDelete={() => onNodeDelete(node.id)}
            />
          </div>

          {/* IF node: render branch container */}
          {node.type === "if_condition" && (
            <div className="w-full mt-2 mb-2">
              <BranchContainer
                ifNode={node}
                allNodes={nodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={onNodeClick}
                onNodeDelete={onNodeDelete}
                onAddClick={(after, parent, branch) => onAddClick(after, parent, branch)}
                getStepNumber={getStepNumber}
              />
            </div>
          )}

          {/* Loop node: render loop container */}
          {node.type === "loop" && (
            <div className="w-full mt-2 mb-2">
              <LoopContainer
                loopNode={node}
                allNodes={nodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={onNodeClick}
                onNodeDelete={onNodeDelete}
                onAddClick={(after, parent, branch) => onAddClick(after, parent, branch)}
                getStepNumber={getStepNumber}
              />
            </div>
          )}

          <AddButton
            onClick={() => onAddClick(node.id)}
          />
        </div>
      ))}
    </div>
  )
}
```

---

### Task 8: Build Node Picker Modal

**Files:**
- Create: `src/components/workflow/NodePickerModal.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/NodePickerModal.tsx
import { useState } from "react"
import { Search, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { NODE_TYPE_META, defaultConfig } from "./nodeTypes"
import type { NodeTypeMeta } from "./nodeTypes"
import type { NodeCategory, WorkflowNode } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (node: WorkflowNode) => void
}

const CATEGORIES: { key: NodeCategory | "all"; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "trigger",      label: "Triggers" },
  { key: "action",       label: "Actions" },
  { key: "flow_control", label: "Flow Control" },
  { key: "integration",  label: "Integrations" },
]

export function NodePickerModal({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | "all">("all")
  const [selectedMeta, setSelectedMeta] = useState<NodeTypeMeta | null>(null)

  function reset() {
    setSearch("")
    setCategoryFilter("all")
    setSelectedMeta(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSelectMeta(meta: NodeTypeMeta) {
    setSelectedMeta(meta)
  }

  function handleConfirm() {
    if (!selectedMeta) return
    const node: WorkflowNode = {
      id: `n-${Date.now()}`,
      type: selectedMeta.type,
      label: selectedMeta.label,
      category: selectedMeta.category,
      status: "unconfigured",
      config: defaultConfig[selectedMeta.type] ?? {},
      ...(selectedMeta.type === "if_condition" && {
        trueBranchNodeIds: [],
        falseBranchNodeIds: [],
      }),
      ...(selectedMeta.type === "loop" && { bodyNodeIds: [] }),
    }
    onSelect(node)
    handleClose()
  }

  const filtered = NODE_TYPE_META.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Step 1: Choose App/Type */}
        {!selectedMeta && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>Add a step</DialogTitle>
              <div className="relative mt-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search steps..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Category tabs */}
              <div className="flex gap-1 mt-3 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key as NodeCategory | "all")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      categoryFilter === cat.key
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((meta) => (
                  <button
                    key={meta.type}
                    onClick={() => handleSelectMeta(meta)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-primary hover:bg-blue-50 text-left transition-colors group"
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0", meta.color)}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{meta.label}</p>
                      <p className="text-xs text-slate-500 truncate">{meta.description}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-slate-400 text-sm">
                    No steps found for "{search}"
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Step 2: Confirm selection */}
        {selectedMeta && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <button
                onClick={() => setSelectedMeta(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <DialogTitle>Add: {selectedMeta.label}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 p-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0", selectedMeta.color)}>
                  {selectedMeta.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedMeta.label}</p>
                  <p className="text-sm text-slate-500">{selectedMeta.description}</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                This step will be added to your workflow. You can configure it after adding.
              </p>
              <button
                onClick={handleConfirm}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Add {selectedMeta.label}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 9: Build Workflow Editor Page

**Files:**
- Create: `src/app/routes/workflow-editor.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the page**
```tsx
// src/app/routes/workflow-editor.tsx
import { useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas"
import { NodePickerModal } from "@/components/workflow/NodePickerModal"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useEditorStore } from "@/stores/editorStore"
import { useWorkflow, useUpdateWorkflow, useSaveWorkflowNodes } from "@/hooks/useWorkflows"
import { useRunWorkflow } from "@/hooks/useExecutions"
import type { WorkflowNode } from "@/types"
import { useState } from "react"

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-slate-500 hover:text-slate-800 transition-colors p-1 rounded"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Editable workflow name */}
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          onBlur={() => {
            if (!workflowName.trim()) setWorkflowName(editorWorkflow.name)
          }}
          className="text-base font-semibold text-slate-800 bg-transparent border-0 outline-none focus:bg-slate-50 focus:ring-1 focus:ring-slate-200 rounded px-2 py-0.5 flex-1 min-w-0"
          placeholder="Workflow name"
        />

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? <Loader2 size={14} className="mr-1.5 animate-spin" />
              : <Save size={14} className="mr-1.5" />
            }
            Save
          </Button>
          <Button size="sm" onClick={handleRun} disabled={isRunning}>
            {isRunning
              ? <Loader2 size={14} className="mr-1.5 animate-spin" />
              : <Play size={14} className="mr-1.5" />
            }
            Run
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-[#f5f5f5]">
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
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-xl z-50 flex items-center justify-center">
          <p className="text-sm text-slate-400">Config panel coming in Phase 8</p>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this step?"
        description="This will remove the step and any child nodes inside branches or loops."
        confirmLabel="Delete step"
        onConfirm={() => { if (deleteTarget) deleteNode(deleteTarget); setDeleteTarget(null) }}
      />
    </div>
  )
}
```

**Step 2: Update router**
```tsx
import { WorkflowEditorPage } from "./routes/workflow-editor"
```
And replace both editor route stubs.

---

### Task 10: Manual Verification

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Verify**
- Navigate to a workflow → see top bar with name, Save, Run buttons
- Click "+" → Node Picker modal opens with search + category filter
- Select a node type → Step 2 confirmation → "Add" → node appears on canvas
- Add IF node → branch container appears below it with True/False columns
- Add Loop node → loop container appears with blue background
- Click a node → right-side panel stub appears ("coming in Phase 8")
- "..." menu on node → Delete removes node from canvas
- Save button → toast "Workflow saved"
- Run button → navigates to execution monitor (stub)

---

### Task 11: Run Tests & Commit

**Step 1: Run tests**
```bash
npm run test:run
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: workflow editor canvas, node cards, node picker modal, branch and loop containers"
```
