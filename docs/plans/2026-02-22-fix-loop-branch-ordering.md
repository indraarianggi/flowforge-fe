# Fix Loop Branch Ordering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure the `loopComplete` branch is always rendered **above** the `loopBody` branch in the auto-layout, regardless of how many nodes each branch contains.

**Architecture:** The fix is a **post-processing step** added after `dagre.layout()` runs inside `autoLayout.ts`. Dagre's crossing-minimisation heuristic only uses edge-insertion order as a seed; when branches have different depths (different node counts), its iterative sweeps can flip the vertical ordering. The post-processor detects inverted branches and swaps the entire y-coordinate cluster for each branch. No changes to React Flow components or stores are needed.

**Tech Stack:** TypeScript, Dagre (`dagre`), Vitest

---

## Root Cause Analysis

### The Problem

In `src/lib/autoLayout.ts`, the current approach to keep `loopComplete` above `loopBody` is:

```ts
// Sort edges so 'loopComplete' is added to dagre before 'loopBody'
const rank = (h: string | undefined) =>
  h === 'true' || h === 'loopComplete' ? 0
  : h === 'false' || h === 'loopBody'  ? 1
  : 2
```

Dagre's crossing-minimisation algorithm uses this edge-addition order as an **initial hint only**. After the first pass, it runs multiple sweeps back-and-forth across ranks to reduce edge crossings. When the two branches have **asymmetric depth** (e.g., `loopBody` = 1 node, `loopComplete` = 2 nodes), the algorithm re-orders within a rank based on downstream structure—flipping the branches.

### The Trigger Condition

Bug surfaces when:
- `loopBody` has **1 node** in its chain
- `loopComplete` has **2 or more nodes** in its chain

The chain depth asymmetry causes dagre to invert the y-ordering during its optimisation sweeps.

### The Fix

After `dagre.layout(g)` runs, **inspect the resulting y-positions**:

1. Find all loop nodes in the graph.
2. For each loop node, look up the first node of `loopComplete` and `loopBody` branches.
3. If `loopComplete` first node has **larger y** (i.e., lower on screen) than `loopBody` first node — ordering is inverted.
4. Collect **all nodes reachable** from each branch start via BFS (excluding the loop node itself to avoid cycle traversal).
5. Compute the y-center of each branch cluster.
6. Shift every node in `loopComplete` cluster **up** (subtract delta) and every node in `loopBody` cluster **down** (add delta), where `delta = completeCenterY − bodyCenterY`.

This swap is stable:
- Preserves relative internal positions within each branch chain.
- Shared downstream nodes (if any merge point exists) cancel out: shifted −delta then +delta = net zero.
- Works for any branch depth asymmetry.

---

## Files Involved

| Action | File |
|--------|------|
| **Modify** | `src/lib/autoLayout.ts` — add post-processing after `dagre.layout()` |
| **Modify** | `src/lib/autoLayout.test.ts` — add two new failing tests, then verify they pass |

---

## Task 1: Add Failing Tests

### Purpose
Write the tests that reproduce the bug *before* fixing it, to confirm the bug exists and to define the acceptance criteria.

**File:** `src/lib/autoLayout.test.ts`

**Step 1: Add two new test cases inside the existing `describe('autoLayout')` block, before the `'returns same number of nodes'` test**

```ts
it('loopComplete stays above loopBody when loopComplete has more nodes than loopBody', () => {
  // Reproduces the bug: 1 node in loopBody, 2 nodes in loopComplete → positions flip
  const nodes = [
    makeNode('trigger', 'manual_trigger'),
    makeNode('loop', 'loop'),
    makeNode('complete1'),
    makeNode('complete2'),
    makeNode('body1'),
  ]
  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'trigger', target: 'loop' },
    { id: 'e2', source: 'loop', target: 'complete1', sourceHandle: 'loopComplete', type: 'loop' },
    { id: 'e3', source: 'complete1', target: 'complete2' },
    { id: 'e4', source: 'loop', target: 'body1', sourceHandle: 'loopBody', type: 'loop' },
  ]
  const result = autoLayout(nodes, edges)
  const complete1 = result.find(n => n.id === 'complete1')!
  const body1 = result.find(n => n.id === 'body1')!

  // loopComplete chain must ALWAYS be above (smaller y) than loopBody
  expect(complete1.position.y).toBeLessThan(body1.position.y)
})

it('loopComplete stays above loopBody when loopBody has more nodes than loopComplete', () => {
  // Inverse asymmetry case — body is longer, complete is shorter
  const nodes = [
    makeNode('trigger', 'manual_trigger'),
    makeNode('loop', 'loop'),
    makeNode('complete1'),
    makeNode('body1'),
    makeNode('body2'),
  ]
  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'trigger', target: 'loop' },
    { id: 'e2', source: 'loop', target: 'complete1', sourceHandle: 'loopComplete', type: 'loop' },
    { id: 'e3', source: 'loop', target: 'body1', sourceHandle: 'loopBody', type: 'loop' },
    { id: 'e4', source: 'body1', target: 'body2' },
  ]
  const result = autoLayout(nodes, edges)
  const complete1 = result.find(n => n.id === 'complete1')!
  const body1 = result.find(n => n.id === 'body1')!

  expect(complete1.position.y).toBeLessThan(body1.position.y)
})
```

**Step 2: Run the tests to confirm they FAIL (proving the bug)**

```bash
pnpm vitest run src/lib/autoLayout.test.ts
```

Expected output: at least one of the two new tests fails with something like:
```
AssertionError: expected 320 to be less than 160
```

---

## Task 2: Implement the Post-Processing Fix

**File:** `src/lib/autoLayout.ts`

**Step 1: Add the `enforceBranchOrder` post-processor after `dagre.layout(g)` and before the final `nodes.map()`**

The full updated file should look like this:

```ts
// src/lib/autoLayout.ts
import dagre from 'dagre'
import type { WorkflowNode, WorkflowEdge } from '@/types'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

export function autoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options?: { rankdir?: string; nodesep?: number; ranksep?: number }
): WorkflowNode[] {
  if (nodes.length === 0) return []

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))

  const rankdir = options?.rankdir ?? 'LR'
  const nodesep = options?.nodesep ?? 80
  const ranksep = options?.ranksep ?? 250

  g.setGraph({ rankdir, nodesep, ranksep })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // Sort branch edges so 'true'/'loopComplete' always precedes 'false'/'loopBody'
  // for the same source node. Dagre uses edge-addition order to seed its
  // crossing-minimisation heuristic, so this guarantees the correct initial order.
  const sortedEdges = [...edges].sort((a, b) => {
    if (a.source !== b.source) return 0
    const rank = (h: string | undefined) =>
      h === 'true' || h === 'loopComplete'
        ? 0
        : h === 'false' || h === 'loopBody'
          ? 1
          : 2
    return rank(a.sourceHandle) - rank(b.sourceHandle)
  })

  sortedEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  // Post-process: enforce loopComplete above loopBody for every loop node.
  // Dagre's crossing-minimisation can flip branch order when branches have
  // different depths (node counts). We detect and correct inverted ordering
  // by shifting the entire y-coordinate cluster of each branch.
  const loopNodeIds = new Set(nodes.filter(n => n.type === 'loop').map(n => n.id))

  if (loopNodeIds.size > 0) {
    // Build forward adjacency list for BFS branch-node collection.
    const adjList = new Map<string, string[]>()
    nodes.forEach(n => adjList.set(n.id, []))
    edges.forEach(edge => {
      const list = adjList.get(edge.source)
      if (list) list.push(edge.target)
    })

    // BFS: collect all node IDs reachable from startId, skipping excludeIds.
    // This prevents re-entering the loop node (which would cause infinite traversal
    // via any loop-back edges) and keeps each branch cluster independent.
    const collectBranchNodes = (startId: string, excludeIds: Set<string>): string[] => {
      const visited = new Set<string>()
      const queue = [startId]
      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current) || excludeIds.has(current)) continue
        visited.add(current)
        ;(adjList.get(current) ?? []).forEach(child => {
          if (!visited.has(child) && !excludeIds.has(child)) queue.push(child)
        })
      }
      return [...visited]
    }

    for (const loopId of loopNodeIds) {
      const completeEdge = edges.find(
        e => e.source === loopId && e.sourceHandle === 'loopComplete'
      )
      const bodyEdge = edges.find(
        e => e.source === loopId && e.sourceHandle === 'loopBody'
      )

      if (!completeEdge || !bodyEdge) continue

      const completeFirstPos = g.node(completeEdge.target)
      const bodyFirstPos = g.node(bodyEdge.target)

      if (!completeFirstPos || !bodyFirstPos) continue

      // In React Flow / dagre LR mode: smaller y = higher on screen = "above".
      // loopComplete must have smaller y than loopBody.
      if (completeFirstPos.y > bodyFirstPos.y) {
        // Branches are inverted — swap their y-coordinate clusters.
        const excluded = new Set([loopId])
        const completeChain = collectBranchNodes(completeEdge.target, excluded)
        const bodyChain = collectBranchNodes(bodyEdge.target, excluded)

        const avg = (ids: string[]) =>
          ids.reduce((sum, id) => sum + g.node(id).y, 0) / ids.length

        const completeCenterY = avg(completeChain)
        const bodyCenterY = avg(bodyChain)
        // delta is positive: complete is erroneously below body
        const delta = completeCenterY - bodyCenterY

        // Shift complete chain up (subtract) and body chain down (add).
        // Any node appearing in both chains (shared downstream merge) gets
        // shifted −delta then +delta = net zero, so merge nodes stay in place.
        completeChain.forEach(id => { g.node(id).y -= delta })
        bodyChain.forEach(id => { g.node(id).y += delta })
      }
    }
  }

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        // dagre returns center coords; React Flow uses top-left
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
```

**Step 2: Run tests to confirm all pass**

```bash
pnpm vitest run src/lib/autoLayout.test.ts
```

Expected output:
```
✓ src/lib/autoLayout.test.ts (8 tests)
```
All 8 tests (6 original + 2 new) should pass.

**Step 3: Run the full test suite to confirm no regressions**

```bash
pnpm vitest run
```

Expected: all test files pass.

---

## Task 3: Commit

```bash
git add src/lib/autoLayout.ts src/lib/autoLayout.test.ts
git commit -m "fix: enforce loopComplete above loopBody after dagre layout

Dagre's crossing-minimisation can flip branch order when the two branches
have different depths. Add a post-processing step that detects inverted
y-positions and shifts the entire y-cluster of each branch to restore the
correct ordering (loopComplete above, loopBody below).

Adds two new regression tests covering the asymmetric-depth scenario."
```

---

## Key Design Decisions

### Why post-process instead of fighting dagre's algorithm?

Dagre's crossing-minimisation is a black-box heuristic. Any attempt to force ordering *within* it (e.g., via undocumented `_order` node properties) would be fragile and version-dependent. Post-processing the positions is transparent, predictable, and version-independent.

### Why BFS from the first branch node?

We need to shift the **entire branch cluster** — not just the first node. Using the forward adjacency list and stopping at the loop node (via `excludeIds`) correctly collects all nodes that belong to a branch without traversing loop-back edges.

### Why the delta-swap approach?

Shifting both clusters by the same `delta` preserves internal relative positions within each chain. If a shared downstream merge node exists, it gets shifted in both directions and ends up at net-zero displacement — correct behavior.

### Why are both asymmetry directions tested?

The bug manifests when *either* branch is longer. Testing both cases (complete-longer and body-longer) ensures the guard condition `completeFirstPos.y > bodyFirstPos.y` correctly handles both scenarios without special-casing.

---

## Verification Checklist

- [ ] New test: `loopComplete stays above loopBody when loopComplete has more nodes` → **FAILS** before fix
- [ ] New test: `loopComplete stays above loopBody when loopBody has more nodes` → **FAILS** before fix (or passes — confirm either way)
- [ ] All 8 tests in `autoLayout.test.ts` pass after fix
- [ ] Full `pnpm vitest run` shows no regressions
- [ ] Manual verification in the workflow editor: add 2+ nodes to Loop Complete, 1 node to Loop Body — Loop Complete stays at top after auto-layout
