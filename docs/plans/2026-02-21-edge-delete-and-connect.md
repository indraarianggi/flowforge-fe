# Edge Delete & Free Connect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to delete edges and freely create new edges by dragging from one node handle to another in the Workflow Editor.

**Architecture:** Two orthogonal additions — (1) a `deleteEdge` store action wired to an X button on selected edges, and (2) an `addEdge` store action wired to React Flow's built-in `onConnect` callback for drag-to-connect. Both must write through to `workflow.edges` (the canonical data model), not just `rfEdges` (the visual layer). Additionally, `onEdgesChange` needs a fix so keyboard-delete (Delete/Backspace on a selected edge) also stays in sync with `workflow.edges`.

**Tech Stack:** React 19, TypeScript, `@xyflow/react` (React Flow v12), Zustand 4, Tailwind CSS 3, Vitest

---

## Context: Two-Layer State Model

The editor maintains two state layers that must stay in sync:

| Layer | Location | Purpose |
|---|---|---|
| `workflow.edges` | `editorStore.workflow.edges` | Canonical data model, persisted on save |
| `rfEdges` | `editorStore.rfEdges` | React Flow visual state, drives rendering |

**Current bug:** `onEdgesChange` only updates `rfEdges`. If a user selects an edge and presses Delete, `rfEdges` loses the edge but `workflow.edges` keeps it — causing a stale save. This plan fixes that too.

---

## Key Files

| File | Role |
|---|---|
| `src/stores/editorStore.ts` | Zustand store — state + actions |
| `src/components/workflow/ReactFlowCanvas.tsx` | React Flow canvas component |
| `src/components/workflow/edges/DefaultEdge.tsx` | Default (gray) edge renderer |
| `src/components/workflow/edges/BranchEdge.tsx` | Branch/loop edge renderer |
| `src/app/routes/workflow-editor.tsx` | Page component — wires everything |
| `src/lib/flowUtils.ts` | `toRFEdges`, `toRFNodes`, `getStepNumbers` helpers |
| `src/types/workflow.ts` | `WorkflowEdge` type |

---

## Task 1: Fix `onEdgesChange` to Sync Removals to `workflow.edges`

**Files:**
- Modify: `src/stores/editorStore.ts` (lines 77–81)

### Context

React Flow fires `onEdgesChange` with `{ type: 'remove', id }` changes when the user selects an edge and presses Delete/Backspace. Currently the handler only calls `applyEdgeChanges` on `rfEdges` but never touches `workflow.edges`. This means saving after a keyboard-delete would re-persist the deleted edge.

### Step 1: Update `onEdgesChange` in the store

Find this block in `src/stores/editorStore.ts`:

```typescript
onEdgesChange: (changes: EdgeChange[]) => {
  set((state) => ({
    rfEdges: applyEdgeChanges(changes, state.rfEdges),
  }))
},
```

Replace with:

```typescript
onEdgesChange: (changes: EdgeChange[]) => {
  set((state) => {
    const newRfEdges = applyEdgeChanges(changes, state.rfEdges)

    // Sync removals to the canonical workflow model
    const removedIds = new Set(
      changes.filter((c) => c.type === 'remove').map((c) => c.id)
    )

    if (removedIds.size === 0 || !state.workflow) {
      return { rfEdges: newRfEdges }
    }

    const newEdges = state.workflow.edges.filter((e) => !removedIds.has(e.id))
    const updatedWf = { ...state.workflow, edges: newEdges }
    const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
    const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
    return { rfEdges: newRfEdges, rfNodes, workflow: updatedWf }
  })
},
```

### Step 2: Manual verification

1. Run the dev server: `pnpm dev`
2. Open a workflow in the editor
3. Click an edge to select it (edge should highlight)
4. Press Delete or Backspace
5. Verify: edge disappears from canvas AND does not reappear on Save + reload

### Step 3: Commit

```bash
git add src/stores/editorStore.ts
git commit -m "fix: sync edge removals from keyboard-delete to workflow.edges"
```

---

## Task 2: Add `deleteEdge` Action to the Store

**Files:**
- Modify: `src/stores/editorStore.ts`

### Context

Task 1 handles keyboard delete. For the X button on edges (Task 3), we need a programmatic `deleteEdge(edgeId)` action that removes an edge from both layers and rebuilds step numbers (since terminal-node status can change when an edge is removed).

### Step 1: Add `deleteEdge` to the `EditorState` interface

Find the `// Actions — Canvas` section and add:

```typescript
// Actions — Edge
deleteEdge: (edgeId: string) => void
addEdge: (connection: Connection) => void
```

Also add `Connection` to the import from `@xyflow/react`:

```typescript
import type { Node, Edge, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange, Connection } from '@xyflow/react'
```

And add `WorkflowEdge` to the import from `@/types` (needed in Task 2 step for `addEdge`):

```typescript
import type { Workflow, WorkflowEdge, WorkflowNode } from '@/types'
```

### Step 2: Implement `deleteEdge` in the store

Add after `deleteNode` (around line 290):

```typescript
deleteEdge: (edgeId) =>
  set((state) => {
    if (!state.workflow) return state
    const newEdges = state.workflow.edges.filter((e) => e.id !== edgeId)
    const updatedWf = { ...state.workflow, edges: newEdges }
    const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
    const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
    const rfEdges = toRFEdges(newEdges)
    return { workflow: updatedWf, rfNodes, rfEdges }
  }),
```

### Step 3: Manual verification (type-check only at this stage)

```bash
pnpm tsc --noEmit
```

Expected: no errors related to `deleteEdge`.

### Step 4: Commit

```bash
git add src/stores/editorStore.ts
git commit -m "feat: add deleteEdge action to editor store"
```

---

## Task 3: Add `addEdge` Action to the Store

**Files:**
- Modify: `src/stores/editorStore.ts`

### Context

When the user drags from a source handle to a target handle, React Flow fires `onConnect` with a `Connection` object. We need to convert that into a `WorkflowEdge` and persist it. The edge type (branch/loop/default) is determined by the `sourceHandle` value.

Handle → edge type mapping:
- `sourceHandle === 'true'` → `type: 'branch'`, `label: 'True'`
- `sourceHandle === 'false'` → `type: 'branch'`, `label: 'False'`
- `sourceHandle === 'loopBody'` → `type: 'loop'`, `label: 'Loop'`
- anything else → no type, no label (default gray edge)

### Step 1: Implement `addEdge` in the store

Add after `deleteEdge`:

```typescript
addEdge: (connection) =>
  set((state) => {
    if (!state.workflow) return state
    const { source, target, sourceHandle, targetHandle } = connection
    if (!source || !target) return state

    const isTrue = sourceHandle === 'true'
    const isFalse = sourceHandle === 'false'
    const isLoop = sourceHandle === 'loopBody'

    const newEdge: WorkflowEdge = {
      id: `e-${Date.now()}`,
      source,
      target,
      sourceHandle: sourceHandle ?? undefined,
      targetHandle: targetHandle ?? undefined,
      type: isTrue || isFalse ? 'branch' : isLoop ? 'loop' : undefined,
      label: isTrue ? 'True' : isFalse ? 'False' : isLoop ? 'Loop' : undefined,
    }

    const newEdges = [...state.workflow.edges, newEdge]
    const updatedWf = { ...state.workflow, edges: newEdges }
    const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
    const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
    const rfEdges = toRFEdges(newEdges)
    return { workflow: updatedWf, rfNodes, rfEdges }
  }),
```

### Step 2: Type-check

```bash
pnpm tsc --noEmit
```

Expected: no errors.

### Step 3: Commit

```bash
git add src/stores/editorStore.ts
git commit -m "feat: add addEdge action to editor store"
```

---

## Task 4: Wire `onConnect` in ReactFlowCanvas and the Editor Page

**Files:**
- Modify: `src/components/workflow/ReactFlowCanvas.tsx`
- Modify: `src/app/routes/workflow-editor.tsx`

### Context

React Flow calls `onConnect` when the user successfully drags a connection line from a source handle to a target handle. We add it as a prop on `ReactFlowCanvas` and wire it through to the `ReactFlow` component.

### Step 1: Update `ReactFlowCanvas` Props and import

In `src/components/workflow/ReactFlowCanvas.tsx`, add `OnConnect` to the import:

```typescript
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
```

Update the `Props` interface:

```typescript
interface Props {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect?: OnConnect
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
  onAddTrigger?: () => void
}
```

Destructure and pass through:

```typescript
export function ReactFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onAddTrigger,
}: Props) {
```

And on the `<ReactFlow>` component, add:

```tsx
onConnect={onConnect}
```

### Step 2: Wire in the editor page

In `src/app/routes/workflow-editor.tsx`, destructure `addEdge` from the store:

```typescript
const {
  // ... existing destructuring ...
  addEdge,
} = useEditorStore()
```

Add a `handleConnect` callback:

```typescript
const handleConnect = useCallback(
  (connection: Connection) => addEdge(connection),
  [addEdge]
)
```

Add the import for `Connection` at the top:

```typescript
import type { Node, Connection } from '@xyflow/react'
```

Pass it to the canvas:

```tsx
<ReactFlowCanvas
  nodes={rfNodes}
  edges={rfEdges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={handleConnect}
  onNodeClick={handleNodeClick}
  onAddTrigger={handleAddTrigger}
/>
```

### Step 3: Manual verification

1. `pnpm dev`
2. Open a workflow with two disconnected nodes (or temporarily disconnect one)
3. Hover over a source handle — it should show a connection cursor
4. Drag from the source handle to a target handle on another node
5. Verify: a new edge appears between the nodes
6. Save and reload — verify the edge persists

### Step 4: Type-check

```bash
pnpm tsc --noEmit
```

### Step 5: Commit

```bash
git add src/components/workflow/ReactFlowCanvas.tsx src/app/routes/workflow-editor.tsx
git commit -m "feat: wire onConnect for free edge creation between nodes"
```

---

## Task 5: Add Delete Button to `DefaultEdge`

**Files:**
- Modify: `src/components/workflow/edges/DefaultEdge.tsx`

### Context

When an edge is selected (user clicked it), show a small red X button next to the existing + button. Clicking X calls `deleteEdge`. React Flow passes a `selected: boolean` prop to all custom edge components.

The two buttons sit side-by-side in a flex group at the edge midpoint. The X button only renders when `selected === true` to avoid cluttering the canvas.

### Step 1: Update `DefaultEdge`

Replace the entire `DefaultEdgeComponent` body:

```tsx
function DefaultEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  source,
  target,
  sourceHandleId,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const openPicker = useEditorStore((s) => s.openPicker)
  const deleteEdge = useEditorStore((s) => s.deleteEdge)

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({
      sourceNodeId: source,
      sourceHandle: sourceHandleId ?? 'main',
      targetNodeId: target,
    })
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    deleteEdge(id)
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: selected ? '#6366f1' : '#cbd5e1',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            aria-label="Add step"
          >
            <Plus size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
          </button>
          {selected && (
            <button
              onClick={handleDeleteClick}
              className="w-6 h-6 rounded-full bg-white border-2 border-red-200 flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all duration-150 shadow-sm hover:shadow group"
              aria-label="Delete connection"
            >
              <X size={12} className="text-red-300 group-hover:text-red-500 transition-colors duration-150" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
```

Add `X` to the lucide-react import:

```typescript
import { Plus, X } from 'lucide-react'
```

### Step 2: Manual verification

1. `pnpm dev`
2. Open a workflow with at least one default (gray) edge
3. Click the edge — it should turn indigo/highlighted
4. Verify an X button appears next to the + button
5. Click X — edge should disappear
6. Verify keyboard Delete also works on a selected edge

### Step 3: Type-check

```bash
pnpm tsc --noEmit
```

### Step 4: Commit

```bash
git add src/components/workflow/edges/DefaultEdge.tsx
git commit -m "feat: add delete button to DefaultEdge on selection"
```

---

## Task 6: Add Delete Button to `BranchEdge`

**Files:**
- Modify: `src/components/workflow/edges/BranchEdge.tsx`

### Context

Same pattern as Task 5 but for branch/loop edges. The X button appears next to the + button when `selected === true`. The edge stroke color changes to indigo when selected (overriding the branch color) so the user gets clear selection feedback.

### Step 1: Update `BranchEdge`

Add `id` and `selected` to destructured props:

```tsx
function BranchEdgeComponent({
  id,
  sourceX,
  ...
  selected,
}: EdgeProps) {
```

Add `deleteEdge` selector:

```typescript
const deleteEdge = useEditorStore((s) => s.deleteEdge)
```

Add `handleDeleteClick`:

```typescript
function handleDeleteClick(e: React.MouseEvent) {
  e.stopPropagation()
  deleteEdge(id)
}
```

Update stroke to reflect selection:

```typescript
stroke: selected ? '#6366f1' : edgeColor,
```

Add X button next to the + button (same pattern as Task 5):

```tsx
{/* + button at midpoint */}
<div
  style={{
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
    pointerEvents: 'all',
  }}
  className="nodrag nopan flex items-center gap-1"
>
  <button onClick={handleAddClick} ... >
    <Plus size={12} ... />
  </button>
  {selected && (
    <button
      onClick={handleDeleteClick}
      className="w-6 h-6 rounded-full bg-white border-2 border-red-200 flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all duration-150 shadow-sm hover:shadow group"
      aria-label="Delete connection"
    >
      <X size={12} className="text-red-300 group-hover:text-red-500 transition-colors duration-150" />
    </button>
  )}
</div>
```

Add `X` to the lucide-react import:

```typescript
import { Plus, X } from 'lucide-react'
```

### Step 2: Manual verification

1. `pnpm dev`
2. Open a workflow with branch edges (add an IF node)
3. Click a True/False/Loop branch edge — it should turn indigo
4. Verify X button appears; click it — edge disappears
5. Check the branch label is still visible while selected

### Step 3: Type-check

```bash
pnpm tsc --noEmit
```

### Step 4: Commit

```bash
git add src/components/workflow/edges/BranchEdge.tsx
git commit -m "feat: add delete button to BranchEdge on selection"
```

---

## Task 7: Final Integration Check

### Step 1: Full type-check

```bash
pnpm tsc --noEmit
```

Expected: 0 errors.

### Step 2: Run tests

```bash
pnpm test
```

Expected: all existing tests pass.

### Step 3: End-to-end smoke test

1. `pnpm dev`
2. Open a workflow
3. **Delete edge via button:** Select a default edge → click X → edge gone
4. **Delete edge via keyboard:** Select a branch edge → press Delete → edge gone
5. **Create edge by dragging:** Hover over a node's source handle → drag to another node's target handle → edge appears with correct color/type
6. **Drag from `true` handle:** Creates a green "True" branch edge
7. **Save and reload:** All changes persist

### Step 4: Final commit (if any cleanup needed)

```bash
git add -A
git commit -m "chore: final integration cleanup for edge delete and connect"
```

---

## Edge Cases to Watch

| Scenario | Expected behavior |
|---|---|
| Delete the only edge in a loop (IF → Merge) | Edge deleted; IF and Merge nodes become disconnected terminal nodes |
| Connect a node handle that already has an outgoing edge | React Flow allows multiple edges from the same handle by default; this is acceptable |
| Drag connection and drop on empty canvas | React Flow cancels the connection; nothing happens |
| Delete edge, then undo (Ctrl+Z) | Not in scope — undo is not currently implemented |

---

## Summary of Changes

| File | Change |
|---|---|
| `stores/editorStore.ts` | Fix `onEdgesChange` sync bug; add `deleteEdge` + `addEdge` actions; add `Connection` + `WorkflowEdge` imports |
| `ReactFlowCanvas.tsx` | Add `onConnect` prop + pass to `<ReactFlow>` |
| `edges/DefaultEdge.tsx` | Add X delete button (shown when `selected`); indigo stroke on selection |
| `edges/BranchEdge.tsx` | Add X delete button (shown when `selected`); indigo stroke on selection |
| `workflow-editor.tsx` | Destructure `addEdge`; add `handleConnect` callback; pass `onConnect` |
