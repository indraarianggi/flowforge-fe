# Loop Node Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold Loop nodes with visible stubs and a loop-back arc so users can always add nodes to Loop Body and Loop Complete flows, even when those branches are empty.

**Architecture:** Two handles on the Loop node's right side (Loop Complete top-30%, Loop Body bottom-70%). Empty branches render node-embedded SVG stubs with `(+)` buttons. When body nodes exist, a derived `LoopBackEdge` ReactFlow edge (never stored in workflow data) renders a dashed arc sweeping below all rows back to the loop node.

**Tech Stack:** React 19, TypeScript, @xyflow/react, Zustand, Vitest

---

## ERD Impact

**No changes to `WorkflowEdge` or `WorkflowNode` types.**

- `WorkflowEdge.type` is already `string?` — no new union needed
- `sourceHandle` already documents `loopBody` / `loopComplete`
- The loop-back arc is a derived render-time edge, never stored in `workflow.edges`
- Handle positions are purely visual — no data model field tracks them

---

## Visual Design Reference

### Empty State

```
                    ┌──────────────────────┐
                    │                    ●─┼────── Loop Complete ──(+)
[prev] ────────────▶│   LOOP / For Each   │
                    │                    ●─┼──╌╌ Loop Body ╌╌(+)╌╌╮
                    └──────────────────────┘                      │
                              ▲                                   │
                              └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯
                                    (decorative SVG arc, no button)
```

### Populated State

```
                    ┌──────────────────────┐
                    │                    ●─┼───(+)──[Complete 1]──(+)
[prev] ────────────▶│   LOOP / For Each   │
                    │                    ●─┼╌╌(+)╌╌[Body 1]╌╌(+)╌╌[Body 2]╌╌╮
                    └──────────────────────┘                                │
                              ▲                                             │
                              └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯
                                  (LoopBackEdge — dashed arc with + button)
```

---

## Task 1: Extend `FlowNodeData` and `toRFNodes` in `flowUtils.ts`

**Files:**

- Modify: `src/lib/flowUtils.ts:5-53`
- Test: `src/lib/flowUtils.test.ts`

### Step 1: Write failing tests

Add to `src/lib/flowUtils.test.ts` inside `describe('toRFNodes', ...)`:

```ts
it("sets loopBodyConnected=true when loop node has a loopBody edge", () => {
  const nodes = [makeNode("loop", "loop", "flow_control"), makeNode("body")];
  const edges: WorkflowEdge[] = [
    { id: "e1", source: "loop", target: "body", sourceHandle: "loopBody" },
  ];
  const stepNumbers = new Map([
    ["loop", "1"],
    ["body", "1.1"],
  ]);
  const rfNodes = toRFNodes(nodes, stepNumbers, edges);
  const loopRF = rfNodes.find((n) => n.id === "loop")!;
  expect(loopRF.data.loopBodyConnected).toBe(true);
  expect(loopRF.data.loopCompleteConnected).toBe(false);
});

it("sets loopCompleteConnected=true when loop node has a loopComplete edge", () => {
  const nodes = [makeNode("loop", "loop", "flow_control"), makeNode("done")];
  const edges: WorkflowEdge[] = [
    { id: "e1", source: "loop", target: "done", sourceHandle: "loopComplete" },
  ];
  const stepNumbers = new Map([
    ["loop", "1"],
    ["done", "2"],
  ]);
  const rfNodes = toRFNodes(nodes, stepNumbers, edges);
  const loopRF = rfNodes.find((n) => n.id === "loop")!;
  expect(loopRF.data.loopBodyConnected).toBe(false);
  expect(loopRF.data.loopCompleteConnected).toBe(true);
});

it("sets both flags false when loop node has no outgoing edges", () => {
  const nodes = [makeNode("loop", "loop", "flow_control")];
  const stepNumbers = new Map([["loop", "1"]]);
  const rfNodes = toRFNodes(nodes, stepNumbers, []);
  const loopRF = rfNodes.find((n) => n.id === "loop")!;
  expect(loopRF.data.loopBodyConnected).toBe(false);
  expect(loopRF.data.loopCompleteConnected).toBe(false);
});
```

### Step 2: Run tests to confirm they fail

```bash
pnpm vitest run src/lib/flowUtils.test.ts
```

Expected: 3 new tests FAIL with `loopBodyConnected is not a property` / undefined errors.

### Step 3: Implement in `flowUtils.ts`

**Add two fields to `FlowNodeData` interface** (after `falseBranchConnected`):

```ts
/** Whether the Loop node's "loopBody" handle already has an outgoing edge */
loopBodyConnected: boolean;
/** Whether the Loop node's "loopComplete" handle already has an outgoing edge */
loopCompleteConnected: boolean;
```

**Add two Sets in `toRFNodes`** (after the existing `nodesWithFalseEdge`):

```ts
const nodesWithLoopBodyEdge = new Set(
  edges.filter((e) => e.sourceHandle === "loopBody").map((e) => e.source),
);
const nodesWithLoopCompleteEdge = new Set(
  edges.filter((e) => e.sourceHandle === "loopComplete").map((e) => e.source),
);
```

**Add to node data mapping** (after `falseBranchConnected`):

```ts
loopBodyConnected: nodesWithLoopBodyEdge.has(wn.id),
loopCompleteConnected: nodesWithLoopCompleteEdge.has(wn.id),
```

### Step 4: Run tests to confirm they pass

```bash
pnpm vitest run src/lib/flowUtils.test.ts
```

Expected: All tests PASS.

### Step 5: Commit

```bash
git add src/lib/flowUtils.ts src/lib/flowUtils.test.ts
git commit -m "feat: add loopBodyConnected + loopCompleteConnected to FlowNodeData"
```

---

## Task 2: Inject synthetic `loopBack` edges in `toRFEdges`

**Files:**

- Modify: `src/lib/flowUtils.ts:59-70`
- Test: `src/lib/flowUtils.test.ts`

### Step 1: Write failing tests

Add to `src/lib/flowUtils.test.ts` inside `describe('toRFEdges', ...)`:

```ts
it("injects a loopBack edge for a loop node with a body chain", () => {
  const nodes: WorkflowNode[] = [
    makeNode("loop", "loop", "flow_control"),
    makeNode("body1"),
    makeNode("body2"),
  ];
  const edges: WorkflowEdge[] = [
    {
      id: "e1",
      source: "loop",
      target: "body1",
      sourceHandle: "loopBody",
      type: "loop",
    },
    { id: "e2", source: "body1", target: "body2" },
  ];
  const rfEdges = toRFEdges(edges, nodes);

  // Should have the 2 real edges + 1 synthetic loopBack
  expect(rfEdges).toHaveLength(3);
  const loopBack = rfEdges.find((e) => e.type === "loopBack")!;
  expect(loopBack).toBeDefined();
  expect(loopBack.source).toBe("body2"); // last node in chain
  expect(loopBack.target).toBe("loop");
});

it("does not inject loopBack when loop node has no body nodes", () => {
  const nodes: WorkflowNode[] = [makeNode("loop", "loop", "flow_control")];
  const rfEdges = toRFEdges([], nodes);
  expect(rfEdges.find((e) => e.type === "loopBack")).toBeUndefined();
});

it("backward-compatible: toRFEdges without nodes still works", () => {
  const edges: WorkflowEdge[] = [{ id: "e1", source: "a", target: "b" }];
  const rfEdges = toRFEdges(edges);
  expect(rfEdges).toHaveLength(1);
});
```

### Step 2: Run tests to confirm they fail

```bash
pnpm vitest run src/lib/flowUtils.test.ts
```

Expected: 3 new tests FAIL.

### Step 3: Implement in `flowUtils.ts`

**Add a helper function** (before `toRFEdges`):

```ts
/**
 * Find the terminal node in a loop body chain starting from a given nodeId.
 * Follows edges with no sourceHandle (main flow) until no outgoing edge found.
 */
function findLoopBodyTerminal(startId: string, edges: WorkflowEdge[]): string {
  let current = startId;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const next = edges.find(
      (e) =>
        e.source === current && (!e.sourceHandle || e.sourceHandle === "main"),
    );
    if (!next) return current;
    current = next.target;
  }
}
```

**Update `toRFEdges` signature** (add optional `nodes` param):

```ts
export function toRFEdges(
  edges: WorkflowEdge[],
  nodes: WorkflowNode[] = [],
): Edge[] {
  const rfEdges: Edge[] = edges.map((we) => ({
    id: we.id,
    source: we.source,
    target: we.target,
    sourceHandle: we.sourceHandle,
    targetHandle: we.targetHandle,
    type: we.type ?? "default",
    label: we.label,
    data: { workflowEdge: we },
  }));

  // Inject synthetic loopBack edges (derived — not stored in workflow data)
  const loopNodes = nodes.filter((n) => n.type === "loop");
  for (const loopNode of loopNodes) {
    const bodyEdge = edges.find(
      (e) => e.source === loopNode.id && e.sourceHandle === "loopBody",
    );
    if (!bodyEdge) continue;

    const terminalId = findLoopBodyTerminal(bodyEdge.target, edges);
    rfEdges.push({
      id: `loopback-${loopNode.id}`,
      source: terminalId,
      target: loopNode.id,
      type: "loopBack",
      data: {},
    });
  }

  return rfEdges;
}
```

### Step 4: Update `rebuildRF` in `editorStore.ts` to pass nodes

`rebuildRF` at line 58–63 calls `toRFEdges(workflow.edges)` — update to:

```ts
const rfEdges = toRFEdges(workflow.edges, workflow.nodes);
```

### Step 5: Run tests to confirm they pass

```bash
pnpm vitest run src/lib/flowUtils.test.ts
```

Expected: All tests PASS.

### Step 6: Commit

```bash
git add src/lib/flowUtils.ts src/lib/flowUtils.test.ts src/stores/editorStore.ts
git commit -m "feat: inject synthetic loopBack edges derived from loop body chain"
```

---

## Task 3: Register `loopBack` edge type in `ReactFlowCanvas.tsx`

**Files:**

- Modify: `src/components/workflow/ReactFlowCanvas.tsx:31-35`

This task creates the new `LoopBackEdge` component (Task 4) and registers it here. Do Task 4 first, then come back to register it. The registration itself is one line:

```ts
import { LoopBackEdge } from "./edges/LoopBackEdge";

const edgeTypes = {
  default: DefaultEdge,
  branch: BranchEdge,
  loop: BranchEdge,
  loopBack: LoopBackEdge, // ← add this
};
```

No tests needed for this registration step — it's wired up and visible immediately in the browser.

### Commit (after Task 4 is done)

```bash
git add src/components/workflow/ReactFlowCanvas.tsx
git commit -m "feat: register LoopBackEdge in ReactFlowCanvas edge types"
```

---

## Task 4: Create `LoopBackEdge.tsx`

**Files:**

- Create: `src/components/workflow/edges/LoopBackEdge.tsx`

### Step 1: Create the component

The loop-back arc sweeps below both node rows from the last body node (source, right side) back to the loop node (target, left side). It uses a custom cubic bezier path — NOT `getSmoothStepPath` — because source is to the right of target.

```tsx
// src/components/workflow/edges/LoopBackEdge.tsx
import { memo } from "react";
import { EdgeLabelRenderer } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";

const LOOP_COLOR = "#3b82f6";
const DROP = 120; // px below both nodes before sweeping left

function LoopBackEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
}: EdgeProps) {
  const openPicker = useEditorStore((s) => s.openPicker);

  // Arc: go down from source, sweep left below both nodes, come back up to target
  const path = [
    `M ${sourceX} ${sourceY}`,
    `C ${sourceX} ${sourceY + DROP}`,
    `  ${targetX} ${targetY + DROP}`,
    `  ${targetX} ${targetY}`,
  ].join(" ");

  // Button at visual bottom-center of the arc
  const buttonX = (sourceX + targetX) / 2;
  const buttonY = Math.max(sourceY, targetY) + DROP;

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation();
    openPicker({ sourceNodeId: source, sourceHandle: "main" });
  }

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={LOOP_COLOR}
        strokeWidth={2}
        strokeDasharray="8 4"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${buttonX}px,${buttonY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            style={{ borderColor: LOOP_COLOR }}
            aria-label="Add step at end of Loop Body"
          >
            <Plus
              size={12}
              className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
            />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const LoopBackEdge = memo(LoopBackEdgeComponent);
```

### Step 2: Verify visually in browser

Start the dev server and open a workflow with a loop node that has body nodes (e.g. wf-004: Weekly Sales Report).

```bash
pnpm dev
```

Check:

- [ ] Dashed blue arc appears sweeping below the body nodes and back to the loop node
- [ ] `(+)` button is visible at the arc's bottom midpoint
- [ ] Clicking `(+)` opens the NodePicker to add after the last body node

### Step 3: Commit

```bash
git add src/components/workflow/edges/LoopBackEdge.tsx
git commit -m "feat: add LoopBackEdge component — dashed arc with add button"
```

---

## Task 5: Update handle positions + add stubs in `FlowControlNode.tsx`

**Files:**

- Modify: `src/components/workflow/nodes/FlowControlNode.tsx`

### Step 1: Update `FlowNodeData` destructuring

Add `loopBodyConnected` and `loopCompleteConnected` to the destructured data (line 11–17):

```ts
const {
  workflowNode,
  stepNumber,
  isTerminalNode,
  trueBranchConnected,
  falseBranchConnected,
  loopBodyConnected, // ← add
  loopCompleteConnected, // ← add
} = data as FlowNodeData;
```

### Step 2: Add handler functions (after `handleAddFalse`)

```ts
function handleAddLoopComplete(e: React.MouseEvent) {
  e.stopPropagation();
  openPicker({ sourceNodeId: workflowNode.id, sourceHandle: "loopComplete" });
}

function handleAddLoopBody(e: React.MouseEvent) {
  e.stopPropagation();
  openPicker({ sourceNodeId: workflowNode.id, sourceHandle: "loopBody" });
}
```

### Step 3: Swap handle positions in the `{nodeType === 'loop'}` block (lines 94–110)

Replace the existing loop handles block:

```tsx
{
  nodeType === "loop" && (
    <>
      {/* Loop Complete — top handle (amber, solid) */}
      <Handle
        type="source"
        position={Position.Right}
        id="loopComplete"
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        style={{ top: "30%" }}
      />
      {/* Loop Body — bottom handle (blue, dashed) */}
      <Handle
        type="source"
        position={Position.Right}
        id="loopBody"
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
        style={{ top: "70%" }}
      />
    </>
  );
}
```

### Step 4: Add Loop Complete stub (after the False branch stub block, before the `hasSingleOutput` block)

```tsx
{
  /* Loop Complete stub — shown when loop node's loopComplete handle has no edge */
}
{
  nodeType === "loop" && !loopCompleteConnected && (
    <div
      className="absolute nodrag nopan"
      style={{
        top: "30%",
        left: "calc(100% + 6px)",
        transform: "translateY(-50%)",
        pointerEvents: "all",
      }}
    >
      <div className="relative flex items-center">
        <div
          style={{
            width: 44,
            height: 2,
            backgroundColor: "#f59e0b",
            flexShrink: 0,
          }}
        />
        <span
          className="absolute whitespace-nowrap text-[10px] font-semibold"
          style={{
            color: "#d97706",
            backgroundColor: "#fef3c7",
            padding: "1px 6px",
            borderRadius: "9999px",
            bottom: "calc(100% + 2px)",
            left: 6,
          }}
        >
          Loop Complete
        </span>
        <button
          onClick={handleAddLoopComplete}
          className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
          style={{ borderColor: "#f59e0b", flexShrink: 0 }}
          aria-label="Add step on Loop Complete"
        >
          <Plus
            size={12}
            className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
          />
        </button>
      </div>
    </div>
  );
}
```

### Step 5: Add Loop Body stub + decorative arc (after Loop Complete stub)

```tsx
{
  /* Loop Body stub — shown when loop node's loopBody handle has no edge */
}
{
  nodeType === "loop" && !loopBodyConnected && (
    <div
      className="absolute nodrag nopan"
      style={{
        top: "70%",
        left: "calc(100% + 6px)",
        transform: "translateY(-50%)",
        pointerEvents: "all",
      }}
    >
      <div className="relative flex items-center">
        {/* Dashed line using gradient trick */}
        <div
          style={{
            width: 44,
            height: 2,
            backgroundImage:
              "repeating-linear-gradient(90deg, #3b82f6 0, #3b82f6 6px, transparent 6px, transparent 12px)",
            flexShrink: 0,
          }}
        />
        <span
          className="absolute whitespace-nowrap text-[10px] font-semibold"
          style={{
            color: "#2563eb",
            backgroundColor: "#eff6ff",
            padding: "1px 6px",
            borderRadius: "9999px",
            top: "calc(100% + 2px)",
            left: 6,
          }}
        >
          Loop Body
        </span>
        <button
          onClick={handleAddLoopBody}
          className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
          style={{ borderColor: "#3b82f6", flexShrink: 0 }}
          aria-label="Add step on Loop Body"
        >
          <Plus
            size={12}
            className="text-slate-400 group-hover:text-indigo-500 transition-colors duration-150"
          />
        </button>
      </div>

      {/* Decorative loop-back arc — purely visual, no interaction */}
      {/* Sweeps down ~120px then left back to node bottom-left */}
      <svg
        style={{
          position: "absolute",
          overflow: "visible",
          top: 0,
          left: 56, // past the 44px line + 12px button center
          pointerEvents: "none",
          width: 0,
          height: 0,
        }}
      >
        {/*
        Path from (+) button: go down, sweep left ~280px, back up to
        approx the node's bottom-left corner.
        Numbers assume node width ~220px + stub offset ~62px = ~282px total.
      */}
        <path
          d="M 0 0 C 0 100, -282 100, -282 28"
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="8 4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
```

### Step 6: Verify visually in browser

Check these scenarios:

**Scenario A — Fresh loop node (no edges):**

- [ ] Loop Complete stub visible at top-right with amber `(+)` button and "Loop Complete" label
- [ ] Loop Body stub visible at bottom-right with blue dashed `(+)` button and "Loop Body" label
- [ ] Decorative dashed arc sweeps below the node back to the left
- [ ] Clicking Loop Complete `(+)` opens NodePicker
- [ ] Clicking Loop Body `(+)` opens NodePicker

**Scenario B — Loop node with only body nodes (e.g. wf-003):**

- [ ] Loop Complete stub still visible (not connected)
- [ ] Loop Body stub gone — replaced by BranchEdge to the first body node
- [ ] LoopBackEdge arc appears from last body node back to loop node

**Scenario C — Loop node with both branches (e.g. wf-004):**

- [ ] Both stubs gone
- [ ] Both branch edges show `(+)` buttons
- [ ] LoopBackEdge arc visible

### Step 7: Commit

```bash
git add src/components/workflow/nodes/FlowControlNode.tsx
git commit -m "feat: swap loop handles, add Loop Complete + Loop Body stubs with arc"
```

---

## Task 6: Fix auto-layout ordering for loop branches

**Files:**

- Modify: `src/lib/autoLayout.ts:32-36`
- Test: `src/lib/autoLayout.test.ts`

### Step 1: Write failing test

Add to `src/lib/autoLayout.test.ts`:

```ts
it("positions Loop Complete branch above loop node, Loop Body branch below", () => {
  const nodes = [
    makeNode("trigger", "manual_trigger"),
    makeNode("loop", "loop"),
    makeNode("complete"),
    makeNode("body"),
  ];
  const edges: WorkflowEdge[] = [
    { id: "e1", source: "trigger", target: "loop" },
    {
      id: "e2",
      source: "loop",
      target: "complete",
      sourceHandle: "loopComplete",
      type: "loop",
    },
    {
      id: "e3",
      source: "loop",
      target: "body",
      sourceHandle: "loopBody",
      type: "loop",
    },
  ];
  const result = autoLayout(nodes, edges);
  const loopNode = result.find((n) => n.id === "loop")!;
  const completeNode = result.find((n) => n.id === "complete")!;
  const bodyNode = result.find((n) => n.id === "body")!;

  // Loop Complete should be ABOVE the loop node center (smaller y)
  expect(completeNode.position.y).toBeLessThan(loopNode.position.y + 40); // 40 = NODE_HEIGHT/2
  // Loop Body should be BELOW the loop node center (larger y)
  expect(bodyNode.position.y).toBeGreaterThan(loopNode.position.y - 40);
  // Complete is above Body
  expect(completeNode.position.y).toBeLessThan(bodyNode.position.y);
});
```

### Step 2: Run test to confirm it fails

```bash
pnpm vitest run src/lib/autoLayout.test.ts
```

Expected: FAIL (currently no ordering for loop handles).

### Step 3: Update the sort rank function in `autoLayout.ts`

Replace line 34:

```ts
// Before:
const rank = (h: string | undefined) =>
  h === "true" ? 0 : h === "false" ? 1 : 2;

// After:
const rank = (h: string | undefined) =>
  h === "true" || h === "loopComplete"
    ? 0
    : h === "false" || h === "loopBody"
      ? 1
      : 2;
```

This tells dagre to place `loopComplete` edges above and `loopBody` edges below, matching the handle positions.

### Step 4: Run tests to confirm they pass

```bash
pnpm vitest run src/lib/autoLayout.test.ts
```

Expected: All tests PASS.

### Step 5: Commit

```bash
git add src/lib/autoLayout.ts src/lib/autoLayout.test.ts
git commit -m "feat: order loop branches in auto-layout — complete above, body below"
```

---

## Task 7: Final verification

### Step 1: Run full test suite

```bash
pnpm vitest run
```

Expected: All tests pass. Zero failures.

### Step 2: Manual browser smoke test

Open `wf-004` (Weekly Sales Report — has both loopBody and loopComplete edges):

- [ ] No stubs visible (both handles connected)
- [ ] LoopBackEdge arc visible, sweeping below body chain
- [ ] `(+)` on arc adds after last body node correctly
- [ ] Auto-layout places complete nodes above loop, body nodes below

Delete all body nodes from the loop one by one:

- [ ] Last body node deleted → stub reappears, LoopBackEdge arc disappears

Add a fresh loop node to an empty canvas:

- [ ] Both stubs immediately visible
- [ ] Decorative arc on Loop Body stub
- [ ] Clicking stubs opens NodePicker with correct context

### Step 3: Final commit (if any last-minute tweaks)

```bash
pnpm vitest run
git add -p
git commit -m "fix: loop node scaffold visual polish"
```

---

## Out of Scope

- Changes to `WorkflowEdge` or `WorkflowNode` types
- Step numbering changes for loop branches (existing `.1`, `.2` suffixes unchanged)
- `editorStore.addNode` / `deleteNode` logic (existing threading works correctly for both handles)
- Nested loops (loop within loop body) — future work
