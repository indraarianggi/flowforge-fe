# IF Node Independent Branches (No Merge) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the forced IF→Merge scaffold so that when an IF node is added, it shows two independent branch stubs (+True, +False) instead of an auto-created Merge node, and each branch executes independently.

**Architecture:** Three layers of change — (1) store simplification (remove `addIfNode`, use `addNode` for all types), (2) data layer enrichment (pass branch-connection status into ReactFlow node data), (3) UI rendering (show branch stub lines with + buttons directly inside the IF node component for any unconnected branch handle). The mock workflow `wf-002` is also updated to remove the existing Merge node so the existing seed data matches the new model.

**Tech Stack:** React 19, TypeScript, Zustand 4, React Flow (`@xyflow/react`), Tailwind CSS 3, Vitest

---

## File Map (quick reference)

| File | Role |
|---|---|
| `src/stores/editorStore.ts` | Zustand store — remove `addIfNode`, simplify interface |
| `src/app/routes/workflow-editor.tsx` | Editor page — remove special IF branching, call `addNode` for all |
| `src/lib/flowUtils.ts` | `FlowNodeData` type + `toRFNodes` — add branch-connection flags |
| `src/components/workflow/nodes/FlowControlNode.tsx` | IF node renderer — add branch stubs with + buttons |
| `src/mocks/workflows.ts` | Seed data — remove Merge node from `wf-002` |

---

### Task 1: Remove `addIfNode` from the Zustand store

**Files:**
- Modify: `src/stores/editorStore.ts`

**Context:**
`addIfNode` (lines 38, 185–265) auto-creates a Merge node and wires 3 edges (IF→Merge true, IF→Merge false, Merge→next). We no longer need it — `addNode` already handles inserting a node mid-edge with any `sourceHandle`.

**Step 1: Delete the `addIfNode` line from the interface (line 38)**

Remove this line from `EditorState`:
```typescript
addIfNode: (node: WorkflowNode, context: PickerContext) => void
```

**Step 2: Delete the `addIfNode` implementation (lines 185–265)**

Remove the entire `addIfNode: (ifNode, context) => set((state) => { ... }),` block.

**Step 3: Run TypeScript check to confirm no lingering references inside the store**

```bash
pnpm tsc --noEmit 2>&1 | grep editorStore
```

Expected: errors only from `workflow-editor.tsx` (the caller), not from `editorStore.ts` itself.

**Step 4: Commit**

```bash
git add src/stores/editorStore.ts
git commit -m "refactor: remove addIfNode — IF nodes now use addNode like all other types"
```

---

### Task 2: Update `workflow-editor.tsx` to use `addNode` for IF condition nodes

**Files:**
- Modify: `src/app/routes/workflow-editor.tsx`

**Context:**
`handleNodeSelected` (lines 96–105) currently branches on `node.type === 'if_condition'` to call `addIfNode`. We simplify it to always call `addNode`.

**Step 1: Remove `addIfNode` from the destructured store values (line 45)**

Change:
```typescript
    addNode,
    addIfNode,
    deleteNode,
```
To:
```typescript
    addNode,
    deleteNode,
```

**Step 2: Simplify `handleNodeSelected`**

Change lines 96–105 from:
```typescript
  function handleNodeSelected(node: WorkflowNode) {
    if (!pickerContext) return
    // IF node auto-scaffolds: IF + Merge + branch edges. All other nodes use generic addNode.
    if (node.type === 'if_condition') {
      addIfNode(node, pickerContext)
    } else {
      addNode(node, pickerContext)
    }
    closePicker()
  }
```
To:
```typescript
  function handleNodeSelected(node: WorkflowNode) {
    if (!pickerContext) return
    addNode(node, pickerContext)
    closePicker()
  }
```

**Step 3: Run TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "error|addIfNode"
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add src/app/routes/workflow-editor.tsx
git commit -m "refactor: use addNode for IF condition nodes in workflow editor"
```

---

### Task 3: Enrich `FlowNodeData` with branch-connection flags

**Files:**
- Modify: `src/lib/flowUtils.ts`

**Context:**
`FlowNodeData` (line 5) and `toRFNodes` (lines 25–41) drive what data each ReactFlow node receives as `data`. We need two new boolean flags so the IF node component knows whether each branch already has a connected edge.

**Step 1: Add `trueBranchConnected` and `falseBranchConnected` to `FlowNodeData`**

Change:
```typescript
export interface FlowNodeData {
  workflowNode: WorkflowNode
  stepNumber: string
  /** True when this node has no outgoing edges — used to render an "add after" button */
  isTerminalNode: boolean
  [key: string]: unknown
}
```
To:
```typescript
export interface FlowNodeData {
  workflowNode: WorkflowNode
  stepNumber: string
  /** True when this node has no outgoing edges — used to render an "add after" button */
  isTerminalNode: boolean
  /** Whether the IF node's "true" handle already has an outgoing edge */
  trueBranchConnected: boolean
  /** Whether the IF node's "false" handle already has an outgoing edge */
  falseBranchConnected: boolean
  [key: string]: unknown
}
```

**Step 2: Compute the new flags inside `toRFNodes`**

Change the function body from:
```typescript
export function toRFNodes(
  nodes: WorkflowNode[],
  stepNumbers: Map<string, string>,
  edges: WorkflowEdge[]
): Node<FlowNodeData>[] {
  const nodesWithOutgoingEdge = new Set(edges.map((e) => e.source))
  return nodes.map((wn) => ({
    id: wn.id,
    type: rfNodeType(wn),
    position: wn.position,
    data: {
      workflowNode: wn,
      stepNumber: stepNumbers.get(wn.id) ?? '?',
      isTerminalNode: !nodesWithOutgoingEdge.has(wn.id),
    },
  }))
}
```
To:
```typescript
export function toRFNodes(
  nodes: WorkflowNode[],
  stepNumbers: Map<string, string>,
  edges: WorkflowEdge[]
): Node<FlowNodeData>[] {
  const nodesWithOutgoingEdge = new Set(edges.map((e) => e.source))
  const nodesWithTrueEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'true').map((e) => e.source)
  )
  const nodesWithFalseEdge = new Set(
    edges.filter((e) => e.sourceHandle === 'false').map((e) => e.source)
  )

  return nodes.map((wn) => ({
    id: wn.id,
    type: rfNodeType(wn),
    position: wn.position,
    data: {
      workflowNode: wn,
      stepNumber: stepNumbers.get(wn.id) ?? '?',
      isTerminalNode: !nodesWithOutgoingEdge.has(wn.id),
      trueBranchConnected: nodesWithTrueEdge.has(wn.id),
      falseBranchConnected: nodesWithFalseEdge.has(wn.id),
    },
  }))
}
```

**Step 3: Run TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep flowUtils
```

Expected: zero errors.

**Step 4: Commit**

```bash
git add src/lib/flowUtils.ts
git commit -m "feat: add trueBranchConnected/falseBranchConnected flags to FlowNodeData"
```

---

### Task 4: Render branch stubs in `FlowControlNode` for unconnected IF handles

**Files:**
- Modify: `src/components/workflow/nodes/FlowControlNode.tsx`

**Context:**
The IF node component currently renders two source handles (`true` at `top: 30%`, `false` at `top: 70%`) with no visual affordance when they have no connected edge. We add absolutely-positioned branch stubs — a colored horizontal line + floating label + + button — for each unconnected branch. Clicking opens the NodePicker with the appropriate `sourceHandle`.

**Visual target (matches wireframe):**
```
[IF Node] ──True──  [+]
          ──False── [+]
```

**Step 1: Destructure new data fields**

Change line 11:
```typescript
  const { workflowNode, stepNumber, isTerminalNode } = data as FlowNodeData
```
To:
```typescript
  const { workflowNode, stepNumber, isTerminalNode, trueBranchConnected, falseBranchConnected } = data as FlowNodeData
```

**Step 2: Add handler functions for the two branch stubs**

Add after `handleAddAfter`:
```typescript
  function handleAddTrue(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: 'true' })
  }

  function handleAddFalse(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({ sourceNodeId: workflowNode.id, sourceHandle: 'false' })
  }
```

**Step 3: Update the `hasSingleOutput` comment to remove the outdated note about IF nodes**

Change:
```typescript
  // Only single-output flow control nodes (wait, merge) get the terminal add button.
  // if_condition and loop are always auto-scaffolded with outgoing edges.
  const hasSingleOutput = nodeType === 'wait' || nodeType === 'merge'
```
To:
```typescript
  // Only single-output flow control nodes (wait, merge) get the terminal add button.
  const hasSingleOutput = nodeType === 'wait' || nodeType === 'merge'
```

**Step 4: Add branch stub markup — after the existing output handles section (after the `{nodeType === 'loop' && ...}` block and before `{hasSingleOutput && isTerminalNode && ...}`)**

Add the following two stub elements:
```tsx
      {/* True branch stub — shown when IF node's true handle has no connected edge */}
      {nodeType === 'if_condition' && !trueBranchConnected && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: '30%',
            left: 'calc(100% + 6px)',
            transform: 'translateY(-50%)',
            pointerEvents: 'all',
          }}
        >
          <div className="relative flex items-center">
            <div style={{ width: 44, height: 2, backgroundColor: '#22c55e', flexShrink: 0 }} />
            <span
              className="absolute whitespace-nowrap text-[10px] font-semibold"
              style={{
                color: '#22c55e',
                backgroundColor: '#f0fdf4',
                padding: '1px 6px',
                borderRadius: '9999px',
                bottom: 'calc(100% + 2px)',
                left: 6,
              }}
            >
              True
            </span>
            <button
              onClick={handleAddTrue}
              className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
              style={{ borderColor: '#22c55e', flexShrink: 0 }}
              aria-label="Add step on True branch"
            >
              <Plus size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
            </button>
          </div>
        </div>
      )}

      {/* False branch stub — shown when IF node's false handle has no connected edge */}
      {nodeType === 'if_condition' && !falseBranchConnected && (
        <div
          className="absolute nodrag nopan"
          style={{
            top: '70%',
            left: 'calc(100% + 6px)',
            transform: 'translateY(-50%)',
            pointerEvents: 'all',
          }}
        >
          <div className="relative flex items-center">
            <div style={{ width: 44, height: 2, backgroundColor: '#94a3b8', flexShrink: 0 }} />
            <span
              className="absolute whitespace-nowrap text-[10px] font-semibold"
              style={{
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '1px 6px',
                borderRadius: '9999px',
                bottom: 'calc(100% + 2px)',
                left: 6,
              }}
            >
              False
            </span>
            <button
              onClick={handleAddFalse}
              className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
              style={{ borderColor: '#94a3b8', flexShrink: 0 }}
              aria-label="Add step on False branch"
            >
              <Plus size={12} className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150" />
            </button>
          </div>
        </div>
      )}
```

**Step 5: Run TypeScript check**

```bash
pnpm tsc --noEmit 2>&1 | grep FlowControlNode
```

Expected: zero errors.

**Step 6: Commit**

```bash
git add src/components/workflow/nodes/FlowControlNode.tsx
git commit -m "feat: show True/False branch stubs with + buttons on IF node when branches are empty"
```

---

### Task 5: Update seed mock `wf-002` — remove Merge node

**Files:**
- Modify: `src/mocks/workflows.ts`

**Context:**
`wf-002` ("Lead Qualifier") uses the old IF→branches→Merge pattern. We keep the two branch action nodes (`n-012`, `n-013`) but remove the Merge node (`n-014`) and the two edges that connect to it (`e-013`, `e-014`). After this change, both action nodes will be terminal nodes and show their own + buttons.

**Step 1: Remove the Merge node from the `nodes` array (lines 103–111)**

Delete:
```typescript
      {
        id: 'n-014',
        type: 'merge',
        label: 'Merge Branches',
        category: 'flow_control',
        status: 'configured',
        config: { strategy: 'choose_branch' },
        position: { x: 0, y: 0 },
      },
```

**Step 2: Remove the two Merge-targeting edges from the `edges` array (lines 117–118)**

Delete:
```typescript
      { id: 'e-013', source: 'n-012', target: 'n-014' },
      { id: 'e-014', source: 'n-013', target: 'n-014' },
```

**Step 3: Update the comment on line 52 to reflect the new shape**

Change:
```typescript
  // Workflow 2: IF branch — webhook → if → [true: notify sales] + [false: nurture] → merge
```
To:
```typescript
  // Workflow 2: IF branch — webhook → if → [true: notify sales] | [false: nurture] (independent branches)
```

**Step 4: Verify the app renders correctly**

```bash
pnpm dev
```

Open `wf-002` in the browser. Expected:
- IF node shows with two branch edges (True green, False gray)
- Each branch ends with an action node that has a + button (terminal)
- No Merge node visible
- Clicking the + button on a branch node opens NodePicker

**Step 5: Commit**

```bash
git add src/mocks/workflows.ts
git commit -m "fix: remove Merge node from wf-002 seed data — branches now execute independently"
```

---

### Task 6: Smoke test the full flow manually

**No code changes — validation only.**

**Scenario A: Add a new IF node to an empty-ish workflow**
1. Open any workflow in the editor
2. Click the + button after the trigger node
3. Select "IF / Condition" from the picker
4. **Expect:** IF node appears with two branch stubs (True green arm + button, False gray arm + button). No Merge node.

**Scenario B: Add a node to the True branch**
1. Click the + button on the True stub of the IF node
2. Select any action node
3. **Expect:** True arm disappears (replaced by a green BranchEdge leading to the new node). False stub remains.

**Scenario C: True branch node is terminal**
1. The action node added in Scenario B should show its own + button (since it's now terminal)
2. Click it and add another node
3. **Expect:** Second node appears after the first in the True branch chain

**Scenario D: IF node inserted mid-flow (splitting an existing edge)**
1. Click the + button on a DefaultEdge mid-flow
2. Select "IF / Condition"
3. **Expect:** IF node inserted. No Merge. Both branch stubs visible. The node that was previously connected is now disconnected from IF (both branches are empty initially).

**Scenario E: Existing `wf-002` seed workflow**
1. Open "Lead Qualifier" workflow
2. **Expect:** IF node with two BranchEdges (True → Notify Sales, False → Nurture). Both action nodes are terminal with + buttons. No Merge node.

---

## Rollout Notes

- The `Merge` node type and its config UI (`MergeConfig.tsx`) are intentionally **not removed** — they may still be useful for users who manually wire up merge behavior via drag-connect. Only the auto-scaffold behavior is removed.
- The `addIfNode` method is fully removed from the store interface and implementation — no backwards compat needed.
- Existing saved workflows that contain a Merge node will still render correctly since the Merge node type is preserved.
