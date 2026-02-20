# React Flow Migration Design

**Date:** February 20, 2026
**Status:** Approved
**Scope:** Migrate workflow editor from custom vertical canvas to React Flow horizontal canvas

---

## 1. Overview

Migrate FlowForge's workflow editor from a custom-built structured vertical canvas to a free-form horizontal canvas powered by React Flow (@xyflow/react). Nodes flow left-to-right and can be individually dragged. Auto-layout via dagre keeps the canvas organized.

### Key Decisions

- **Direction:** Left-to-right horizontal flow
- **Branching:** IF true/false branches auto-positioned vertically (true above, false below) with colored labeled edges
- **Loops:** Body nodes connected inline as individual nodes (no visual container)
- **Layout engine:** dagre for DAG auto-layout
- **Positioning:** Auto-layout on structural changes; user drag positions preserved until next add/delete

---

## 2. Data Model Changes

### 2.1 WorkflowNode

Add `position` field, remove branch/loop ID arrays:

```diff
 interface WorkflowNode {
   id: string
   type: NodeType
   label: string
   category: NodeCategory
   status: NodeStatus
   config: NodeConfig
+  position: { x: number; y: number }
   parentId?: string              // KEEP: branch/loop membership
   branchType?: 'true' | 'false' | 'body'  // KEEP
-  trueBranchNodeIds?: string[]   // REMOVE
-  falseBranchNodeIds?: string[]  // REMOVE
-  bodyNodeIds?: string[]         // REMOVE
 }
```

### 2.2 Workflow

Replace `nodeOrder` with `edges`:

```diff
 interface Workflow {
   id: string
   userId: string
   name: string
   description?: string
   isActive: boolean
   nodes: WorkflowNode[]
-  nodeOrder: string[]
+  edges: WorkflowEdge[]
   settings: { timeout?: number; errorMode?: 'stop' | 'continue' }
   lastRunAt?: string
   createdAt: string
   updatedAt: string
 }
```

### 2.3 New WorkflowEdge Type

```typescript
interface WorkflowEdge {
  id: string
  source: string          // source node ID
  target: string          // target node ID
  sourceHandle?: string   // 'main' | 'true' | 'false' | 'loopBody' | 'loopComplete'
  targetHandle?: string   // 'main' | 'branchA' | 'branchB'
  type?: string           // 'default' | 'branch' | 'loop'
  label?: string          // 'True' | 'False' | 'Loop'
}
```

---

## 3. Implementation Plan

### Phase 1: Foundation (Setup & Data Model)

**Step 1.1: Install dependencies**
```bash
npm install @xyflow/react dagre @types/dagre
```

**Step 1.2: Update TypeScript types**
- File: `src/types/workflow.ts`
- Add `position` to `WorkflowNode`
- Add `WorkflowEdge` interface
- Update `Workflow` to use `edges` instead of `nodeOrder`
- Remove `trueBranchNodeIds`, `falseBranchNodeIds`, `bodyNodeIds`

**Step 1.3: Create auto-layout utility**
- File: `src/lib/autoLayout.ts`
- Function: `autoLayout(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[]`
- Uses dagre with `rankdir: 'LR'`, `nodesep: 80`, `ranksep: 250`
- Returns nodes with updated positions

**Step 1.4: Create flow utilities**
- File: `src/lib/flowUtils.ts`
- `toRFNodes(nodes: WorkflowNode[]): Node[]` — convert to React Flow nodes
- `toRFEdges(edges: WorkflowEdge[]): Edge[]` — convert to React Flow edges
- `fromRFNodes(rfNodes: Node[]): WorkflowNode[]` — extract positions back
- `getStepNumbers(nodes: Node[], edges: Edge[]): Map<string, string>` — compute step labels from topological order

**Step 1.5: Update mock data**
- File: `src/mocks/workflows.ts`
- Replace `nodeOrder` with `edges` for all 3 seed workflows
- Add `position` to all nodes (auto-computed by dagre)
- Remove `trueBranchNodeIds`, `falseBranchNodeIds`, `bodyNodeIds`

### Phase 2: Custom React Flow Nodes

**Step 2.1: Create shared node content component**
- File: `src/components/workflow/nodes/NodeContent.tsx`
- Renders: category accent border, icon, step number, label, status badge, context menu
- Adapts from existing `NodeCard.tsx` styling

**Step 2.2: Create TriggerNode**
- File: `src/components/workflow/nodes/TriggerNode.tsx`
- Purple left accent
- Single output `Handle` on right side (id: 'main')
- Uses `NodeContent` internally

**Step 2.3: Create ActionNode**
- File: `src/components/workflow/nodes/ActionNode.tsx`
- Blue left accent
- Input `Handle` on left (id: 'main'), output `Handle` on right (id: 'main')
- Uses `NodeContent` internally

**Step 2.4: Create FlowControlNode**
- File: `src/components/workflow/nodes/FlowControlNode.tsx`
- Amber left accent
- Handles vary by node type:
  - **IF**: input left, output-true top-right, output-false bottom-right
  - **Loop**: input left, output-loopBody right, output-loopComplete bottom-right
  - **Merge**: input-branchA top-left, input-branchB bottom-left, output right
  - **Wait**: input left, output right

### Phase 3: Custom React Flow Edges

**Step 3.1: Create DefaultEdge**
- File: `src/components/workflow/edges/DefaultEdge.tsx`
- Smoothstep edge (rounded corners)
- "+" button rendered at midpoint using `EdgeLabelRenderer`
- Click "+" opens NodePickerModal with edge context

**Step 3.2: Create BranchEdge**
- File: `src/components/workflow/edges/BranchEdge.tsx`
- Extends DefaultEdge with:
  - Green color + "True" label for true branches
  - Gray color + "False" label for false branches
  - Blue dashed + "Loop" label for loop body connections
- Also has "+" button at midpoint

### Phase 4: React Flow Canvas

**Step 4.1: Create ReactFlowCanvas**
- File: `src/components/workflow/ReactFlowCanvas.tsx`
- `<ReactFlowProvider>` wrapper
- `<ReactFlow>` with:
  - Custom node types: `{ trigger: TriggerNode, action: ActionNode, flowControl: FlowControlNode }`
  - Custom edge types: `{ default: DefaultEdge, branch: BranchEdge }`
  - `<Controls>` (zoom in/out/fit)
  - `<MiniMap>` (bottom-right, collapsed by default)
  - `<Background variant="dots" />`
  - `onNodesChange`, `onEdgesChange`, `onNodeClick` handlers
  - `fitView` on initial load
  - `snapToGrid={true}` with 20px grid

### Phase 5: Editor Store Migration

**Step 5.1: Rewrite editorStore**
- File: `src/stores/editorStore.ts`
- New state shape:
  - `workflow: Workflow | null`
  - `rfNodes: Node[]` — React Flow nodes
  - `rfEdges: Edge[]` — React Flow edges
  - `selectedNodeId`, `isPanelOpen`, `isPickerOpen`, `pickerContext`
- React Flow handlers: `onNodesChange`, `onEdgesChange`
- Actions:
  - `loadWorkflow(id)`: load → convert to RF nodes/edges → auto-layout → set state
  - `addNode(node, context)`: create node + edges, split existing edge if needed, auto-layout
  - `deleteNode(id)`: remove node, reconnect source→target edges, auto-layout
  - `autoLayout()`: run dagre, update positions
  - `syncWorkflowFromRF()`: extract positions from rfNodes back to workflow.nodes

**Step 5.2: Update addNode logic for IF nodes**
- When adding an IF node: auto-create a Merge node downstream
- Create 4 edges: source→IF, IF(true)→Merge, IF(false)→Merge, Merge→target
- Run auto-layout to position branches

**Step 5.3: Update addNode logic for Loop nodes**
- When adding a Loop node: create with loopBody and loopComplete handles
- Initial state: loopBody edge connects to next node (or is empty for later)

### Phase 6: Page Integration

**Step 6.1: Update workflow-editor.tsx**
- Replace `<WorkflowCanvas>` with `<ReactFlowCanvas>`
- Update toolbar: add "Auto Layout" button
- Keep: top bar, save, test run, config panel
- Remove: manual connector rendering

**Step 6.2: Update NodePickerModal**
- Accept `pickerContext: { sourceNodeId, sourceHandle, targetNodeId }`
- On node selection: call `editorStore.addNode()` with context
- Remove old array-based insertion logic

**Step 6.3: Update NodeConfigPanel**
- Minimal changes — still opens as a right-side Sheet
- Config forms stay the same
- Variable picker: derive previous nodes from edges (topological walk) instead of `nodeOrder`

### Phase 7: Cleanup

**Step 7.1: Remove old components**
- Delete: `WorkflowCanvas.tsx`, `BranchContainer.tsx`, `LoopContainer.tsx`, `AddButton.tsx`

**Step 7.2: Update VariablePicker**
- Compute available variables by walking edges backwards from current node
- No longer depends on `nodeOrder`

**Step 7.3: Update mock data imports**
- Ensure all mock workflow consumers use new edge-based format

---

## 4. New Dependencies

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| @xyflow/react | ^12.x | React Flow canvas | ~150KB |
| dagre | ^0.8.x | DAG auto-layout | ~30KB |
| @types/dagre | ^0.7.x | TypeScript types | dev only |

---

## 5. Files Changed Summary

### New Files (8)
- `src/components/workflow/ReactFlowCanvas.tsx`
- `src/components/workflow/nodes/TriggerNode.tsx`
- `src/components/workflow/nodes/ActionNode.tsx`
- `src/components/workflow/nodes/FlowControlNode.tsx`
- `src/components/workflow/nodes/NodeContent.tsx`
- `src/components/workflow/edges/DefaultEdge.tsx`
- `src/components/workflow/edges/BranchEdge.tsx`
- `src/lib/autoLayout.ts`
- `src/lib/flowUtils.ts`

### Modified Files (7)
- `src/types/workflow.ts` — new types, remove old fields
- `src/stores/editorStore.ts` — major rewrite
- `src/app/routes/workflow-editor.tsx` — use new canvas
- `src/components/workflow/NodePickerModal.tsx` — edge context
- `src/components/workflow/VariablePicker.tsx` — edge-based traversal
- `src/mocks/workflows.ts` — new data format
- `package.json` — new dependencies

### Deleted Files (4)
- `src/components/workflow/WorkflowCanvas.tsx`
- `src/components/workflow/BranchContainer.tsx`
- `src/components/workflow/LoopContainer.tsx`
- `src/components/workflow/AddButton.tsx`

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| React Flow bundle size (~150KB) | Acceptable for a canvas-heavy app; code-split editor route |
| dagre layout quality for complex workflows | Test with seed data; adjust spacing parameters |
| Losing branch visual clarity without containers | Colored labeled edges + auto-layout positioning |
| Node drag breaking logical order | Step numbers recomputed from topological sort of edges |
| Config panel interaction with React Flow events | Stop event propagation on panel interactions |

---

## 7. Testing Strategy

- Verify all 3 seed workflows render correctly with auto-layout
- Verify node add/delete maintains edge integrity
- Verify IF node creation auto-inserts Merge
- Verify branch edges are correctly colored and labeled
- Verify drag-and-drop preserves positions
- Verify auto-layout button resets positions
- Verify config panel opens on node click
- Verify variable picker derives correct previous nodes from edges
- Verify step numbering follows topological order
