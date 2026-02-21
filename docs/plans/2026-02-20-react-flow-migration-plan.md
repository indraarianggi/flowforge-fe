# React Flow Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate FlowForge's workflow editor from a custom vertical canvas to a React Flow horizontal canvas with dagre auto-layout, edges-based data model, and custom node/edge components.

**Architecture:** Replace array-based node ordering (`nodeOrder`, `trueBranchNodeIds`, etc.) with an edges-based graph model (`WorkflowEdge[]`). The canvas switches from a custom DOM layout to `@xyflow/react` with dagre computing node positions automatically. Custom React Flow node types render the existing `NodeCard`-style UI inside React Flow's node wrappers.

**Tech Stack:** @xyflow/react 12.x, dagre 0.8.x, Zustand 4, React 19, TypeScript, Tailwind CSS

---

## Phase 1: Foundation (Setup & Data Model)

### Task 1.1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install @xyflow/react, dagre, and @types/dagre**

Run:
```bash
npm install @xyflow/react dagre @types/dagre
```

Expected: packages added to `package.json` dependencies

**Step 2: Verify the app still builds**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @xyflow/react, dagre dependencies"
```

---

### Task 1.2: Update TypeScript types

**Files:**
- Modify: `src/types/workflow.ts`

**Step 1: Write a test for the new type shape**

Create: `src/types/workflow.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { WorkflowNode, WorkflowEdge, Workflow } from './workflow'

describe('WorkflowNode type', () => {
  it('should include position field', () => {
    const node: WorkflowNode = {
      id: 'n-1',
      type: 'http_request',
      label: 'Test',
      category: 'action',
      status: 'unconfigured',
      config: { url: '', method: 'GET', headers: [], queryParams: [], bodyType: 'json', authType: 'none', timeout: 5000 },
      position: { x: 0, y: 0 },
    }
    expect(node.position).toEqual({ x: 0, y: 0 })
  })

  it('should NOT have trueBranchNodeIds, falseBranchNodeIds, bodyNodeIds', () => {
    const node: WorkflowNode = {
      id: 'n-1',
      type: 'if_condition',
      label: 'IF',
      category: 'flow_control',
      status: 'unconfigured',
      config: { combinator: 'AND', conditions: [] },
      position: { x: 0, y: 0 },
    }
    // These properties should not exist on the type
    expect('trueBranchNodeIds' in node).toBe(false)
    expect('falseBranchNodeIds' in node).toBe(false)
    expect('bodyNodeIds' in node).toBe(false)
  })

  it('should support credentialId, onError, disabled fields', () => {
    const node: WorkflowNode = {
      id: 'n-1',
      type: 'telegram_send_message',
      label: 'Send Message',
      category: 'integration',
      status: 'configured',
      config: {},
      position: { x: 0, y: 0 },
      credentialId: 'cred-001',
      onError: 'stop',
      disabled: false,
    }
    expect(node.credentialId).toBe('cred-001')
    expect(node.onError).toBe('stop')
    expect(node.disabled).toBe(false)
  })
})

describe('WorkflowEdge type', () => {
  it('should have required fields', () => {
    const edge: WorkflowEdge = {
      id: 'e-1',
      source: 'n-1',
      target: 'n-2',
    }
    expect(edge.id).toBe('e-1')
    expect(edge.source).toBe('n-1')
    expect(edge.target).toBe('n-2')
  })

  it('should support optional handle and type fields', () => {
    const edge: WorkflowEdge = {
      id: 'e-1',
      source: 'n-1',
      target: 'n-2',
      sourceHandle: 'true',
      type: 'branch',
      label: 'True',
    }
    expect(edge.sourceHandle).toBe('true')
    expect(edge.type).toBe('branch')
    expect(edge.label).toBe('True')
  })
})

describe('Workflow type', () => {
  it('should have edges instead of nodeOrder', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      userId: 'user-1',
      name: 'Test',
      isActive: false,
      nodes: [],
      edges: [],
      settings: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    expect(workflow.edges).toEqual([])
    expect('nodeOrder' in workflow).toBe(false)
  })

  it('should support WorkflowSettings shape', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      userId: 'user-1',
      name: 'Test',
      isActive: false,
      nodes: [],
      edges: [],
      settings: { maxExecutionTimeMs: 300000, maxLoopIterations: 1000 },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    expect(workflow.settings.maxExecutionTimeMs).toBe(300000)
    // old fields should not exist
    expect('timeout' in workflow.settings).toBe(false)
    expect('errorMode' in workflow.settings).toBe(false)
  })

  it('triggerConfig is optional and read-only from backend', () => {
    const workflow: Workflow = {
      id: 'wf-1',
      userId: 'user-1',
      name: 'Test',
      isActive: false,
      nodes: [],
      edges: [],
      settings: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    // triggerConfig absent by default (populated by backend on save)
    expect(workflow.triggerConfig).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/workflow.test.ts`

Expected: FAIL — `position` does not exist on type `WorkflowNode`, `WorkflowEdge` does not exist, `edges` does not exist on `Workflow`

**Step 3: Update the types in `src/types/workflow.ts`**

Replace `WorkflowNode` interface (lines 119-134):

```typescript
export interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  category: NodeCategory
  status: NodeStatus
  config: NodeConfig
  position: { x: number; y: number }
  credentialId?: string           // top-level for quick execution engine access (not buried inside config)
  onError?: 'stop' | 'continue' | 'retry' | 'skipItem'  // default: 'stop'. 'skipItem' only valid inside Loop
  retryCount?: number             // only when onError = 'retry'. Default: 3
  retryDelayMs?: number           // delay between retries in ms. Default: 1000
  disabled?: boolean              // if true, skip during execution. Default: false
  parentId?: string               // for nodes inside branches/loops
  branchType?: 'true' | 'false' | 'body'
}
```

Add new `WorkflowEdge` interface (after `WorkflowNode`):

```typescript
export interface WorkflowEdge {
  id: string
  source: string          // source node ID
  target: string          // target node ID
  sourceHandle?: string   // 'main' | 'true' | 'false' | 'loopBody' | 'loopComplete'
  targetHandle?: string   // 'main' | 'branchA' | 'branchB'
  type?: string           // 'default' | 'branch' | 'loop'
  label?: string          // 'True' | 'False' | 'Loop'
}
```

Add `WorkflowSettings` interface (after `WorkflowEdge`):

```typescript
export interface WorkflowSettings {
  timezone?: string           // IANA timezone. Default: 'UTC'
  maxExecutionTimeMs?: number // Max total execution time in ms. Default: 300000 (5 min)
  maxLoopIterations?: number  // Max iterations per Loop node. Default: 1000
  maxNestingDepth?: number    // Max branch/loop nesting depth. Default: 3
}
```

Add `TriggerConfig` type (after `WorkflowSettings`):

```typescript
export type TriggerConfig =
  | { type: 'manual' }
  | { type: 'webhook'; webhookPath: string; method: string }
  | { type: 'schedule'; cronExpression: string; timezone: string }
  | { type: 'telegram'; credentialId: string; chatFilter: 'all' | string[] }
```

Replace `Workflow` interface (lines 136-152):

```typescript
export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  isActive: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  settings: WorkflowSettings
  triggerConfig?: TriggerConfig  // read-only — derived by the backend on save, never sent by the frontend
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}
```

Also update `src/types/index.ts` to re-export `WorkflowEdge`, `WorkflowSettings`, and `TriggerConfig`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/workflow.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/types/workflow.ts src/types/workflow.test.ts src/types/index.ts
git commit -m "feat: update data model — add position, edges, WorkflowEdge; remove nodeOrder and branch/loop arrays"
```

---

### Task 1.3: Create auto-layout utility

**Files:**
- Create: `src/lib/autoLayout.ts`
- Create: `src/lib/autoLayout.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/autoLayout.test.ts
import { describe, it, expect } from 'vitest'
import { autoLayout } from './autoLayout'
import type { WorkflowNode, WorkflowEdge } from '@/types'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request'): WorkflowNode {
  return {
    id,
    type,
    label: id,
    category: type.includes('trigger') ? 'trigger' : 'action',
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 0, y: 0 },
  }
}

describe('autoLayout', () => {
  it('positions a linear 3-node workflow left-to-right', () => {
    const nodes = [makeNode('a', 'schedule_trigger'), makeNode('b'), makeNode('c')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const result = autoLayout(nodes, edges)
    // Each subsequent node should be further right (larger x)
    expect(result[0].position.x).toBeLessThan(result[1].position.x)
    expect(result[1].position.x).toBeLessThan(result[2].position.x)
    // All on same y (no branching)
    expect(result[0].position.y).toBe(result[1].position.y)
  })

  it('positions IF true branch above false branch', () => {
    const nodes = [makeNode('trigger', 'manual_trigger'), makeNode('if', 'if_condition'), makeNode('trueN'), makeNode('falseN'), makeNode('merge', 'merge')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'if' },
      { id: 'e2', source: 'if', target: 'trueN', sourceHandle: 'true', type: 'branch', label: 'True' },
      { id: 'e3', source: 'if', target: 'falseN', sourceHandle: 'false', type: 'branch', label: 'False' },
      { id: 'e4', source: 'trueN', target: 'merge' },
      { id: 'e5', source: 'falseN', target: 'merge' },
    ]
    const result = autoLayout(nodes, edges)
    const trueNode = result.find(n => n.id === 'trueN')!
    const falseNode = result.find(n => n.id === 'falseN')!
    // True branch should be above (smaller y) or equal, false below (larger y)
    expect(trueNode.position.y).toBeLessThan(falseNode.position.y)
  })

  it('returns same number of nodes', () => {
    const nodes = [makeNode('a'), makeNode('b')]
    const edges: WorkflowEdge[] = [{ id: 'e1', source: 'a', target: 'b' }]
    const result = autoLayout(nodes, edges)
    expect(result).toHaveLength(2)
  })

  it('handles empty graph', () => {
    const result = autoLayout([], [])
    expect(result).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/autoLayout.test.ts`

Expected: FAIL — `autoLayout` module not found

**Step 3: Implement `autoLayout`**

```typescript
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

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/autoLayout.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/autoLayout.ts src/lib/autoLayout.test.ts
git commit -m "feat: add dagre-based autoLayout utility for LR node positioning"
```

---

### Task 1.4: Create flow conversion utilities

**Files:**
- Create: `src/lib/flowUtils.ts`
- Create: `src/lib/flowUtils.test.ts`

**Step 1: Write the test**

```typescript
// src/lib/flowUtils.test.ts
import { describe, it, expect } from 'vitest'
import { toRFNodes, toRFEdges, fromRFNodes, getStepNumbers } from './flowUtils'
import type { WorkflowNode, WorkflowEdge } from '@/types'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return {
    id,
    type,
    label: `Node ${id}`,
    category,
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 100, y: 200 },
  }
}

describe('toRFNodes', () => {
  it('converts WorkflowNodes to React Flow nodes with correct structure', () => {
    const nodes = [makeNode('n-1', 'schedule_trigger', 'trigger')]
    const stepNumbers = new Map([['n-1', '1']])
    const rfNodes = toRFNodes(nodes, stepNumbers)

    expect(rfNodes).toHaveLength(1)
    expect(rfNodes[0].id).toBe('n-1')
    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[0].position).toEqual({ x: 100, y: 200 })
    expect(rfNodes[0].data.workflowNode.id).toBe('n-1')
    expect(rfNodes[0].data.stepNumber).toBe('1')
  })

  it('maps node category to React Flow node type', () => {
    const nodes = [
      makeNode('t', 'schedule_trigger', 'trigger'),
      makeNode('a', 'http_request', 'action'),
      makeNode('f', 'if_condition', 'flow_control'),
      makeNode('i', 'telegram_send_message', 'integration'),
    ]
    const stepNumbers = new Map([['t', '1'], ['a', '2'], ['f', '3'], ['i', '4']])
    const rfNodes = toRFNodes(nodes, stepNumbers)

    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[1].type).toBe('action')
    expect(rfNodes[2].type).toBe('flowControl')
    expect(rfNodes[3].type).toBe('action') // integrations use action node type
  })
})

describe('toRFEdges', () => {
  it('converts WorkflowEdges to React Flow edges', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e-1', source: 'n-1', target: 'n-2' },
    ]
    const rfEdges = toRFEdges(edges)

    expect(rfEdges).toHaveLength(1)
    expect(rfEdges[0].id).toBe('e-1')
    expect(rfEdges[0].source).toBe('n-1')
    expect(rfEdges[0].target).toBe('n-2')
    expect(rfEdges[0].type).toBe('default')
  })

  it('maps branch edges to branch type', () => {
    const edges: WorkflowEdge[] = [
      { id: 'e-1', source: 'n-1', target: 'n-2', sourceHandle: 'true', type: 'branch', label: 'True' },
    ]
    const rfEdges = toRFEdges(edges)

    expect(rfEdges[0].type).toBe('branch')
    expect(rfEdges[0].label).toBe('True')
    expect(rfEdges[0].sourceHandle).toBe('true')
  })
})

describe('fromRFNodes', () => {
  it('extracts positions from React Flow nodes back into WorkflowNodes', () => {
    const originalNodes = [makeNode('n-1')]
    const rfNodes = [{ id: 'n-1', position: { x: 300, y: 400 }, data: {}, type: 'action' }]

    const result = fromRFNodes(originalNodes, rfNodes as any)
    expect(result[0].position).toEqual({ x: 300, y: 400 })
    expect(result[0].id).toBe('n-1')
  })
})

describe('getStepNumbers', () => {
  it('computes topological step numbers for linear flow', () => {
    const nodes: WorkflowNode[] = [
      makeNode('a', 'schedule_trigger', 'trigger'),
      makeNode('b'),
      makeNode('c'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ]
    const steps = getStepNumbers(nodes, edges)

    expect(steps.get('a')).toBe('1')
    expect(steps.get('b')).toBe('2')
    expect(steps.get('c')).toBe('3')
  })

  it('labels branch nodes with a/b suffix', () => {
    const nodes: WorkflowNode[] = [
      makeNode('trigger', 'manual_trigger', 'trigger'),
      makeNode('if', 'if_condition', 'flow_control'),
      makeNode('trueN'),
      makeNode('falseN'),
      makeNode('merge', 'merge', 'flow_control'),
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 'trigger', target: 'if' },
      { id: 'e2', source: 'if', target: 'trueN', sourceHandle: 'true', type: 'branch' },
      { id: 'e3', source: 'if', target: 'falseN', sourceHandle: 'false', type: 'branch' },
      { id: 'e4', source: 'trueN', target: 'merge' },
      { id: 'e5', source: 'falseN', target: 'merge' },
    ]
    const steps = getStepNumbers(nodes, edges)

    expect(steps.get('trigger')).toBe('1')
    expect(steps.get('if')).toBe('2')
    expect(steps.get('trueN')).toBe('2a')
    expect(steps.get('falseN')).toBe('2b')
    expect(steps.get('merge')).toBe('3')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flowUtils.test.ts`

Expected: FAIL — module not found

**Step 3: Implement `flowUtils.ts`**

```typescript
// src/lib/flowUtils.ts
import type { Node, Edge } from '@xyflow/react'
import type { WorkflowNode, WorkflowEdge } from '@/types'

export interface FlowNodeData {
  workflowNode: WorkflowNode
  stepNumber: string
  [key: string]: unknown
}

/**
 * Map node category to React Flow custom node type key
 */
function rfNodeType(node: WorkflowNode): string {
  if (node.category === 'trigger') return 'trigger'
  if (node.category === 'flow_control') return 'flowControl'
  return 'action' // action + integration both use the action node type
}

/**
 * Convert WorkflowNodes → React Flow Node[]
 */
export function toRFNodes(
  nodes: WorkflowNode[],
  stepNumbers: Map<string, string>
): Node<FlowNodeData>[] {
  return nodes.map((wn) => ({
    id: wn.id,
    type: rfNodeType(wn),
    position: wn.position,
    data: {
      workflowNode: wn,
      stepNumber: stepNumbers.get(wn.id) ?? '?',
    },
  }))
}

/**
 * Convert WorkflowEdges → React Flow Edge[]
 */
export function toRFEdges(edges: WorkflowEdge[]): Edge[] {
  return edges.map((we) => ({
    id: we.id,
    source: we.source,
    target: we.target,
    sourceHandle: we.sourceHandle,
    targetHandle: we.targetHandle,
    type: we.type ?? 'default',
    label: we.label,
    data: { workflowEdge: we },
  }))
}

/**
 * Extract updated positions from React Flow nodes back into WorkflowNodes
 */
export function fromRFNodes(
  workflowNodes: WorkflowNode[],
  rfNodes: Node[]
): WorkflowNode[] {
  const posMap = new Map(rfNodes.map((n) => [n.id, n.position]))
  return workflowNodes.map((wn) => {
    const pos = posMap.get(wn.id)
    return pos ? { ...wn, position: pos } : wn
  })
}

/**
 * Compute step numbers from topological order of a DAG.
 * Branch edges (sourceHandle 'true'/'false') produce a/b suffixed labels.
 * Loop body edges (sourceHandle 'loopBody') produce dot-suffixed labels.
 */
export function getStepNumbers(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, string> {
  const result = new Map<string, string>()
  if (nodes.length === 0) return result

  // Build adjacency and in-degree
  const adj = new Map<string, WorkflowEdge[]>()
  const inDegree = new Map<string, number>()
  const nodeIds = new Set(nodes.map((n) => n.id))

  for (const id of nodeIds) {
    adj.set(id, [])
    inDegree.set(id, 0)
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    adj.get(edge.source)!.push(edge)
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  // Kahn's topological sort
  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  let stepCounter = 1

  while (queue.length > 0) {
    const current = queue.shift()!

    // Assign step number if not already assigned (branch nodes get assigned by parent)
    if (!result.has(current)) {
      result.set(current, String(stepCounter++))
    }

    const outEdges = adj.get(current) ?? []

    // Check if this node has branch outputs
    const trueEdges = outEdges.filter((e) => e.sourceHandle === 'true')
    const falseEdges = outEdges.filter((e) => e.sourceHandle === 'false')
    const loopBodyEdges = outEdges.filter((e) => e.sourceHandle === 'loopBody')
    const normalEdges = outEdges.filter(
      (e) => !e.sourceHandle || e.sourceHandle === 'main' || e.sourceHandle === 'loopComplete'
    )

    const parentStep = result.get(current)!

    // Assign branch labels
    for (const edge of trueEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}a`)
      }
    }
    for (const edge of falseEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}b`)
      }
    }

    // Assign loop body labels
    let loopBodyCounter = 1
    for (const edge of loopBodyEdges) {
      if (!result.has(edge.target)) {
        result.set(edge.target, `${parentStep}.${loopBodyCounter++}`)
      }
    }

    // Process all targets
    for (const edge of outEdges) {
      const target = edge.target
      inDegree.set(target, (inDegree.get(target) ?? 0) - 1)
      if (inDegree.get(target) === 0) {
        queue.push(target)
      }
    }
  }

  return result
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/flowUtils.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/flowUtils.ts src/lib/flowUtils.test.ts
git commit -m "feat: add flow conversion utilities (toRFNodes, toRFEdges, fromRFNodes, getStepNumbers)"
```

---

### Task 1.5: Update mock data to edge-based format

**Files:**
- Modify: `src/mocks/workflows.ts`

**Step 1: Write a test for mock data structure**

Create: `src/mocks/workflows.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { seedWorkflows } from './workflows'

describe('seedWorkflows', () => {
  it('should have 3 workflows', () => {
    expect(seedWorkflows).toHaveLength(3)
  })

  it('all workflows should have edges array (not nodeOrder)', () => {
    for (const wf of seedWorkflows) {
      expect(wf).toHaveProperty('edges')
      expect(Array.isArray(wf.edges)).toBe(true)
      expect('nodeOrder' in wf).toBe(false)
    }
  })

  it('all nodes should have position field', () => {
    for (const wf of seedWorkflows) {
      for (const node of wf.nodes) {
        expect(node).toHaveProperty('position')
        expect(typeof node.position.x).toBe('number')
        expect(typeof node.position.y).toBe('number')
      }
    }
  })

  it('no nodes should have trueBranchNodeIds, falseBranchNodeIds, or bodyNodeIds', () => {
    for (const wf of seedWorkflows) {
      for (const node of wf.nodes) {
        expect('trueBranchNodeIds' in node).toBe(false)
        expect('falseBranchNodeIds' in node).toBe(false)
        expect('bodyNodeIds' in node).toBe(false)
      }
    }
  })

  it('wf-001 (linear) has 2 edges connecting 3 nodes', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-001')!
    expect(wf.nodes).toHaveLength(3)
    expect(wf.edges).toHaveLength(2)
  })

  it('wf-002 (IF branch) has branch edges with sourceHandle true/false', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-002')!
    const trueEdge = wf.edges.find(e => e.sourceHandle === 'true')
    const falseEdge = wf.edges.find(e => e.sourceHandle === 'false')
    expect(trueEdge).toBeDefined()
    expect(falseEdge).toBeDefined()
    expect(trueEdge!.type).toBe('branch')
    expect(falseEdge!.type).toBe('branch')
  })

  it('wf-003 (loop) has loopBody edge', () => {
    const wf = seedWorkflows.find(w => w.id === 'wf-003')!
    const loopEdge = wf.edges.find(e => e.sourceHandle === 'loopBody')
    expect(loopEdge).toBeDefined()
    expect(loopEdge!.type).toBe('loop')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/mocks/workflows.test.ts`

Expected: FAIL — `edges` does not exist on type, `nodeOrder` still present

**Step 3: Rewrite `src/mocks/workflows.ts` with edge-based format**

```typescript
// src/mocks/workflows.ts
import type { Workflow } from '@/types'

export const seedWorkflows: Workflow[] = [
  // Workflow 1: Simple linear — schedule_trigger → http_request → telegram_send_message
  {
    id: 'wf-001',
    userId: 'user-001',
    name: 'Daily Weather Report',
    description: 'Fetch weather data and send via Telegram every morning',
    isActive: true,
    nodes: [
      {
        id: 'n-001',
        type: 'schedule_trigger',
        label: 'Every day at 9am',
        category: 'trigger',
        status: 'configured',
        config: { preset: 'daily', cron: '0 9 * * *', timezone: 'Asia/Jakarta' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-002',
        type: 'http_request',
        label: 'Fetch Weather API',
        category: 'action',
        status: 'tested',
        config: { url: 'https://api.weather.example.com/current?city=Jakarta', method: 'GET', headers: [], queryParams: [], bodyType: 'json', authType: 'none', timeout: 5000 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-003',
        type: 'telegram_send_message',
        label: 'Send Weather Report',
        category: 'integration',
        status: 'configured',
        credentialId: 'cred-001',  // top-level for engine access
        config: {},
        position: { x: 0, y: 0 },
      },
    ],
    edges: [
      { id: 'e-001', source: 'n-001', target: 'n-002' },
      { id: 'e-002', source: 'n-002', target: 'n-003' },
    ],
    settings: {},
    lastRunAt: '2026-02-18T09:00:00.000Z',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-18T09:00:00.000Z',
  },

  // Workflow 2: IF branch — webhook → if → [true: notify sales] + [false: nurture] → merge
  {
    id: 'wf-002',
    userId: 'user-001',
    name: 'Lead Qualifier',
    description: 'Qualify incoming leads and route to appropriate team',
    isActive: true,
    nodes: [
      {
        id: 'n-010',
        type: 'webhook_trigger',
        label: 'New Lead Webhook',
        category: 'trigger',
        status: 'configured',
        config: { path: 'lead-qualifier-abc123', method: 'POST', responseMode: 'immediately' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-011',
        type: 'if_condition',
        label: 'Check Lead Score',
        category: 'flow_control',
        status: 'configured',
        config: {
          combinator: 'AND',
          conditions: [{ id: 'c-001', field: '{{ $trigger.json.score }}', operation: 'greater_than', value: '70' }],
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-012',
        type: 'http_request',
        label: 'Notify Sales Team',
        category: 'action',
        status: 'configured',
        parentId: 'n-011',
        branchType: 'true',
        config: { url: 'https://hooks.example.com/sales', method: 'POST', headers: [], queryParams: [], bodyType: 'json', body: '{"lead": "{{ $trigger.json }}"}', authType: 'none', timeout: 5000 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-013',
        type: 'http_request',
        label: 'Add to Nurture Campaign',
        category: 'action',
        status: 'configured',
        parentId: 'n-011',
        branchType: 'false',
        config: { url: 'https://hooks.example.com/nurture', method: 'POST', headers: [], queryParams: [], bodyType: 'json', body: '{"lead": "{{ $trigger.json }}"}', authType: 'none', timeout: 5000 },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-014',
        type: 'merge',
        label: 'Merge Branches',
        category: 'flow_control',
        status: 'configured',
        config: { strategy: 'choose_branch' },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [
      { id: 'e-010', source: 'n-010', target: 'n-011' },
      { id: 'e-011', source: 'n-011', target: 'n-012', sourceHandle: 'true', type: 'branch', label: 'True' },
      { id: 'e-012', source: 'n-011', target: 'n-013', sourceHandle: 'false', type: 'branch', label: 'False' },
      { id: 'e-013', source: 'n-012', target: 'n-014' },
      { id: 'e-014', source: 'n-013', target: 'n-014' },
    ],
    settings: {},
    lastRunAt: '2026-02-17T14:30:00.000Z',
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-02-17T14:30:00.000Z',
  },

  // Workflow 3: Loop — manual_trigger → loop → [http_request body]
  {
    id: 'wf-003',
    userId: 'user-001',
    name: 'Bulk Email Sender',
    description: 'Send personalized emails to each row in a Google Sheet',
    isActive: false,
    nodes: [
      {
        id: 'n-020',
        type: 'manual_trigger',
        label: 'Manual Trigger',
        category: 'trigger',
        status: 'configured',
        config: { sampleData: '{"rows": [{"email": "a@example.com", "name": "Alice"}]}' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-021',
        type: 'loop',
        label: 'For Each Row',
        category: 'flow_control',
        status: 'configured',
        config: { mode: 'forEach', source: '{{ $trigger.json.rows }}', batchSize: 1, onItemError: 'skipItem' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'n-022',
        type: 'http_request',
        label: 'Send Email',
        category: 'action',
        status: 'configured',
        parentId: 'n-021',
        branchType: 'body',
        config: { url: 'https://api.email.example.com/send', method: 'POST', headers: [], queryParams: [], bodyType: 'json', body: '{"to": "{{ $item.email }}", "name": "{{ $item.name }}"}', authType: 'bearer', authConfig: { token: 'my-email-api-key' }, timeout: 10000 },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [
      { id: 'e-020', source: 'n-020', target: 'n-021' },
      { id: 'e-021', source: 'n-021', target: 'n-022', sourceHandle: 'loopBody', type: 'loop', label: 'Loop' },
    ],
    settings: {},
    lastRunAt: '2026-02-10T10:00:00.000Z',
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  },
]
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/mocks/workflows.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/mocks/workflows.ts src/mocks/workflows.test.ts
git commit -m "feat: migrate mock workflows to edge-based format with positions"
```

---

## Phase 2: Custom React Flow Nodes

### Task 2.1: Create NodeContent shared component

**Files:**
- Create: `src/components/workflow/nodes/NodeContent.tsx`

This component extracts the shared rendering logic from the existing `NodeCard.tsx` — icon, step number, label, status badge, and context menu. It will be used inside all three React Flow custom node types.

**Step 1: Create the component**

```typescript
// src/components/workflow/nodes/NodeContent.tsx
import { CheckCircle2, AlertCircle, XCircle, Minus, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getNodeMeta } from '../nodeTypes'
import type { WorkflowNode } from '@/types'

function StatusIcon({ status }: { status: WorkflowNode['status'] }) {
  if (status === 'tested') return <CheckCircle2 size={14} className="text-emerald-500" />
  if (status === 'configured') return <Minus size={14} className="text-amber-400" />
  if (status === 'error') return <XCircle size={14} className="text-red-500" />
  return <AlertCircle size={14} className="text-slate-300" />
}

interface Props {
  node: WorkflowNode
  stepNumber: string
  isSelected: boolean
  onDelete: () => void
}

export function NodeContent({ node, stepNumber, isSelected, onDelete }: Props) {
  const meta = getNodeMeta(node.type)

  const borderAccent = {
    trigger: 'border-l-violet-400',
    action: 'border-l-blue-400',
    flow_control: 'border-l-amber-400',
    integration: 'border-l-sky-400',
  }[node.category] ?? 'border-l-slate-300'

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 border-l-4 p-3.5 w-[220px]',
        'hover:shadow-md hover:border-slate-300 transition-all duration-150 group',
        isSelected && 'border-slate-300 shadow-md ring-2 ring-indigo-500/20 bg-indigo-50/30',
        borderAccent
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 font-medium',
            'transition-transform duration-150 group-hover:scale-105',
            meta.color
          )}
        >
          {meta.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              {stepNumber}
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              {meta.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{node.label}</p>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusIcon status={node.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 size={13} className="mr-2" /> Delete step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify the app still builds**

Run: `npm run build`

Expected: Build succeeds (component is created but not yet imported anywhere)

**Step 3: Commit**

```bash
git add src/components/workflow/nodes/NodeContent.tsx
git commit -m "feat: create NodeContent shared component for React Flow nodes"
```

---

### Task 2.2: Create TriggerNode

**Files:**
- Create: `src/components/workflow/nodes/TriggerNode.tsx`

**Step 1: Create the component**

```typescript
// src/components/workflow/nodes/TriggerNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData

  return (
    <>
      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
        onDelete={() => {
          // Deletion is handled by the store via onNodeClick → delete action
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="main"
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-white"
      />
    </>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
```

**Step 2: Commit**

```bash
git add src/components/workflow/nodes/TriggerNode.tsx
git commit -m "feat: create TriggerNode with output handle"
```

---

### Task 2.3: Create ActionNode

**Files:**
- Create: `src/components/workflow/nodes/ActionNode.tsx`

**Step 1: Create the component**

```typescript
// src/components/workflow/nodes/ActionNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function ActionNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="main"
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
        onDelete={() => {}}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="main"
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
      />
    </>
  )
}

export const ActionNode = memo(ActionNodeComponent)
```

**Step 2: Commit**

```bash
git add src/components/workflow/nodes/ActionNode.tsx
git commit -m "feat: create ActionNode with input/output handles"
```

---

### Task 2.4: Create FlowControlNode

**Files:**
- Create: `src/components/workflow/nodes/FlowControlNode.tsx`

**Step 1: Create the component**

This node has multiple handle configurations depending on the node type (IF, Loop, Merge, Wait):

```typescript
// src/components/workflow/nodes/FlowControlNode.tsx
import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { NodeContent } from './NodeContent'
import type { FlowNodeData } from '@/lib/flowUtils'

function FlowControlNodeComponent({ data, selected }: NodeProps) {
  const { workflowNode, stepNumber } = data as FlowNodeData
  const nodeType = workflowNode.type

  return (
    <>
      {/* Input handles */}
      {nodeType === 'merge' ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="branchA"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="branchB"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
            style={{ top: '70%' }}
          />
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}

      <NodeContent
        node={workflowNode}
        stepNumber={stepNumber}
        isSelected={selected ?? false}
        onDelete={() => {}}
      />

      {/* Output handles */}
      {nodeType === 'if_condition' && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white"
            style={{ top: '70%' }}
          />
        </>
      )}

      {nodeType === 'loop' && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="loopBody"
            className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white"
            style={{ top: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="loopComplete"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
          />
        </>
      )}

      {(nodeType === 'wait' || nodeType === 'merge') && (
        <Handle
          type="source"
          position={Position.Right}
          id="main"
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />
      )}
    </>
  )
}

export const FlowControlNode = memo(FlowControlNodeComponent)
```

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/workflow/nodes/FlowControlNode.tsx
git commit -m "feat: create FlowControlNode with dynamic handles for IF, Loop, Merge, Wait"
```

---

## Phase 3: Custom React Flow Edges

### Task 3.1: Create DefaultEdge

**Files:**
- Create: `src/components/workflow/edges/DefaultEdge.tsx`

**Step 1: Create the component**

```typescript
// src/components/workflow/edges/DefaultEdge.tsx
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

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

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({
      sourceNodeId: source,
      sourceHandle: sourceHandleId ?? 'main',
      targetNodeId: target,
    })
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#cbd5e1' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
          >
            <Plus size={12} className="text-slate-400 group-hover:text-indigo-500" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const DefaultEdge = memo(DefaultEdgeComponent)
```

**Step 2: Commit**

```bash
git add src/components/workflow/edges/DefaultEdge.tsx
git commit -m "feat: create DefaultEdge with smoothstep path and + button at midpoint"
```

---

### Task 3.2: Create BranchEdge

**Files:**
- Create: `src/components/workflow/edges/BranchEdge.tsx`

**Step 1: Create the component**

```typescript
// src/components/workflow/edges/BranchEdge.tsx
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'

function BranchEdgeComponent({
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
  label,
  data,
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

  // Determine color and dash based on source handle
  const isTrueBranch = sourceHandleId === 'true'
  const isFalseBranch = sourceHandleId === 'false'
  const isLoopBody = sourceHandleId === 'loopBody'

  const edgeColor = isTrueBranch ? '#22c55e' : isFalseBranch ? '#94a3b8' : '#3b82f6'
  const strokeDasharray = isLoopBody ? '8 4' : undefined
  const labelText = label ?? (isTrueBranch ? 'True' : isFalseBranch ? 'False' : 'Loop')

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    openPicker({
      sourceNodeId: source,
      sourceHandle: sourceHandleId ?? 'main',
      targetNodeId: target,
    })
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: edgeColor,
          strokeDasharray,
        }}
      />
      <EdgeLabelRenderer>
        {/* Branch label near source */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -120%) translate(${sourceX + 30}px,${sourceY}px)`,
            pointerEvents: 'none',
          }}
        >
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              color: edgeColor,
              backgroundColor: isTrueBranch ? '#f0fdf4' : isFalseBranch ? '#f1f5f9' : '#eff6ff',
            }}
          >
            {labelText}
          </span>
        </div>

        {/* + button at midpoint */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={handleAddClick}
            className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center hover:bg-indigo-50 transition-all duration-150 shadow-sm hover:shadow group"
            style={{ borderColor: edgeColor }}
          >
            <Plus size={12} className="text-slate-400 group-hover:text-indigo-500" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export const BranchEdge = memo(BranchEdgeComponent)
```

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/workflow/edges/BranchEdge.tsx
git commit -m "feat: create BranchEdge with colored labels for true/false/loop"
```

---

## Phase 4: React Flow Canvas

### Task 4.1: Create ReactFlowCanvas

**Files:**
- Create: `src/components/workflow/ReactFlowCanvas.tsx`

**Step 1: Create the component**

```typescript
// src/components/workflow/ReactFlowCanvas.tsx
import { useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { FlowControlNode } from './nodes/FlowControlNode'
import { DefaultEdge } from './edges/DefaultEdge'
import { BranchEdge } from './edges/BranchEdge'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  flowControl: FlowControlNode,
}

const edgeTypes = {
  default: DefaultEdge,
  branch: BranchEdge,
  loop: BranchEdge, // loop edges reuse BranchEdge with different styling
}

interface Props {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onNodeClick?: (event: React.MouseEvent, node: Node) => void
}

export function ReactFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
}: Props) {
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.3}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: 'default' }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          position="bottom-left"
          className="!bg-white !border-slate-200 !shadow-sm !rounded-lg"
        />
        <MiniMap
          position="bottom-right"
          className="!bg-white !border-slate-200 !shadow-sm !rounded-lg"
          maskColor="rgba(0,0,0,0.1)"
          pannable
          zoomable
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  )
}
```

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/workflow/ReactFlowCanvas.tsx
git commit -m "feat: create ReactFlowCanvas with custom node/edge types, controls, minimap"
```

---

## Phase 5: Editor Store Migration

### Task 5.1: Rewrite editorStore

**Files:**
- Modify: `src/stores/editorStore.ts`

This is the most complex task. The store needs to manage React Flow nodes/edges, handle auto-layout, and support the new edge-based insertion/deletion logic.

**Step 1: Write tests for the new store**

Create: `src/stores/editorStore.test.ts`

```typescript
// src/stores/editorStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './editorStore'
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types'

function makeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Workflow {
  return {
    id: 'wf-test',
    userId: 'user-1',
    name: 'Test Workflow',
    isActive: false,
    nodes,
    edges,
    settings: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return {
    id,
    type,
    label: `Node ${id}`,
    category,
    status: 'unconfigured',
    config: {} as WorkflowNode['config'],
    position: { x: 0, y: 0 },
  }
}

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      workflow: null,
      rfNodes: [],
      rfEdges: [],
      selectedNodeId: null,
      isPanelOpen: false,
      isPickerOpen: false,
      pickerContext: null,
    })
  })

  describe('loadWorkflow', () => {
    it('sets workflow and generates RF nodes/edges', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)

      const state = useEditorStore.getState()
      expect(state.workflow).toBeDefined()
      expect(state.rfNodes).toHaveLength(2)
      expect(state.rfEdges).toHaveLength(1)
      // Nodes should have been auto-laid-out (positions updated from 0,0)
      expect(state.rfNodes[0].position.x).not.toBe(0)
    })
  })

  describe('addNode', () => {
    it('adds a node between two existing nodes by splitting an edge', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)

      const newNode = makeNode('c')
      useEditorStore.getState().addNode(newNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(3)
      expect(state.workflow!.edges).toHaveLength(2)
      // Edge from a→b should be replaced by a→c and c→b
      const edgeSources = state.workflow!.edges.map(e => `${e.source}->${e.target}`)
      expect(edgeSources).toContain('a->c')
      expect(edgeSources).toContain('c->b')
    })

    it('adds a node at the end (no target)', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger')],
        []
      )
      useEditorStore.getState().loadWorkflow(wf)

      const newNode = makeNode('b')
      useEditorStore.getState().addNode(newNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
      })

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(2)
      expect(state.workflow!.edges).toHaveLength(1)
      expect(state.workflow!.edges[0].source).toBe('a')
      expect(state.workflow!.edges[0].target).toBe('b')
    })
  })

  describe('deleteNode', () => {
    it('removes a node and reconnects surrounding edges', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b'), makeNode('c')],
        [
          { id: 'e1', source: 'a', target: 'b' },
          { id: 'e2', source: 'b', target: 'c' },
        ]
      )
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().deleteNode('b')

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(2)
      expect(state.workflow!.edges).toHaveLength(1)
      expect(state.workflow!.edges[0].source).toBe('a')
      expect(state.workflow!.edges[0].target).toBe('c')
    })

    it('removes a terminal node and its incoming edge', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().deleteNode('b')

      const state = useEditorStore.getState()
      expect(state.workflow!.nodes).toHaveLength(1)
      expect(state.workflow!.edges).toHaveLength(0)
    })
  })

  describe('selectNode', () => {
    it('sets selectedNodeId and opens panel', () => {
      const wf = makeWorkflow([makeNode('a')], [])
      useEditorStore.getState().loadWorkflow(wf)
      useEditorStore.getState().selectNode('a')

      const state = useEditorStore.getState()
      expect(state.selectedNodeId).toBe('a')
      expect(state.isPanelOpen).toBe(true)
    })
  })

  describe('openPicker / closePicker', () => {
    it('sets picker context and clears it', () => {
      useEditorStore.getState().openPicker({
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })
      expect(useEditorStore.getState().isPickerOpen).toBe(true)
      expect(useEditorStore.getState().pickerContext).toEqual({
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })

      useEditorStore.getState().closePicker()
      expect(useEditorStore.getState().isPickerOpen).toBe(false)
      expect(useEditorStore.getState().pickerContext).toBeNull()
    })
  })

  describe('addIfNode', () => {
    it('scaffolds IF + Merge + 4 edges when inserted between two nodes', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger'), makeNode('b')],
        [{ id: 'e1', source: 'a', target: 'b' }]
      )
      useEditorStore.getState().loadWorkflow(wf)

      const ifNode = makeNode('if-1', 'if_condition', 'flow_control')
      useEditorStore.getState().addIfNode(ifNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
        targetNodeId: 'b',
      })

      const state = useEditorStore.getState()
      // IF node + auto-created Merge node added alongside existing a, b
      expect(state.workflow!.nodes).toHaveLength(4)
      const mergeNode = state.workflow!.nodes.find(n => n.type === 'merge')
      expect(mergeNode).toBeDefined()

      // Edges: a→IF, IF→Merge(true/branchA), IF→Merge(false/branchB), Merge→b
      expect(state.workflow!.edges).toHaveLength(4)
      const trueEdge = state.workflow!.edges.find(e => e.sourceHandle === 'true')
      const falseEdge = state.workflow!.edges.find(e => e.sourceHandle === 'false')
      expect(trueEdge?.source).toBe('if-1')
      expect(trueEdge?.targetHandle).toBe('branchA')
      expect(trueEdge?.type).toBe('branch')
      expect(falseEdge?.source).toBe('if-1')
      expect(falseEdge?.targetHandle).toBe('branchB')
      expect(falseEdge?.type).toBe('branch')
      // Merge connects to original target
      const mergeOutEdge = state.workflow!.edges.find(e => e.source === mergeNode!.id)
      expect(mergeOutEdge?.target).toBe('b')
    })

    it('scaffolds IF + Merge + 3 edges when appended at end (no target)', () => {
      const wf = makeWorkflow(
        [makeNode('a', 'schedule_trigger', 'trigger')],
        []
      )
      useEditorStore.getState().loadWorkflow(wf)

      const ifNode = makeNode('if-1', 'if_condition', 'flow_control')
      useEditorStore.getState().addIfNode(ifNode, {
        sourceNodeId: 'a',
        sourceHandle: 'main',
      })

      const state = useEditorStore.getState()
      // trigger + IF + Merge
      expect(state.workflow!.nodes).toHaveLength(3)
      const mergeNode = state.workflow!.nodes.find(n => n.type === 'merge')
      expect(mergeNode).toBeDefined()
      // a→IF, IF→Merge(true), IF→Merge(false)
      expect(state.workflow!.edges).toHaveLength(3)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/editorStore.test.ts`

Expected: FAIL — new methods/state properties don't exist yet

**Step 3: Rewrite `src/stores/editorStore.ts`**

```typescript
// src/stores/editorStore.ts
import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange } from '@xyflow/react'
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/types'
import { autoLayout } from '@/lib/autoLayout'
import { toRFNodes, toRFEdges, fromRFNodes, getStepNumbers } from '@/lib/flowUtils'
import type { FlowNodeData } from '@/lib/flowUtils'

export interface PickerContext {
  sourceNodeId: string
  sourceHandle?: string
  targetNodeId?: string
}

interface EditorState {
  // Workflow data
  workflow: Workflow | null

  // React Flow state
  rfNodes: Node<FlowNodeData>[]
  rfEdges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange

  // UI state
  selectedNodeId: string | null
  isPanelOpen: boolean
  isPickerOpen: boolean
  pickerContext: PickerContext | null

  // Actions — Workflow
  loadWorkflow: (workflow: Workflow) => void
  setName: (name: string) => void

  // Actions — Node CRUD
  addNode: (node: WorkflowNode, context: PickerContext) => void
  addIfNode: (node: WorkflowNode, context: PickerContext) => void  // scaffolds IF + Merge + branch edges
  deleteNode: (nodeId: string) => void
  updateNodeConfig: (nodeId: string, config: WorkflowNode['config']) => void
  updateNodeStatus: (nodeId: string, status: WorkflowNode['status']) => void

  // Actions — Canvas
  runAutoLayout: () => void
  selectNode: (nodeId: string) => void
  closePanel: () => void
  openPicker: (context: PickerContext) => void
  closePicker: () => void

  // Actions — Sync
  syncWorkflowFromRF: () => void
}

function rebuildRF(workflow: Workflow): { rfNodes: Node<FlowNodeData>[]; rfEdges: Edge[] } {
  const laidOut = autoLayout(workflow.nodes, workflow.edges)
  const updatedWorkflowNodes = laidOut
  const stepNumbers = getStepNumbers(updatedWorkflowNodes, workflow.edges)
  const rfNodes = toRFNodes(updatedWorkflowNodes, stepNumbers)
  const rfEdges = toRFEdges(workflow.edges)
  return { rfNodes, rfEdges }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  workflow: null,
  rfNodes: [],
  rfEdges: [],
  selectedNodeId: null,
  isPanelOpen: false,
  isPickerOpen: false,
  pickerContext: null,

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      rfNodes: applyNodeChanges(changes, state.rfNodes) as Node<FlowNodeData>[],
    }))
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      rfEdges: applyEdgeChanges(changes, state.rfEdges),
    }))
  },

  loadWorkflow: (workflow) => {
    const laidOut = autoLayout(workflow.nodes, workflow.edges)
    const wfWithPositions = { ...workflow, nodes: laidOut }
    const { rfNodes, rfEdges } = rebuildRF(wfWithPositions)
    set({ workflow: wfWithPositions, rfNodes, rfEdges })
  },

  setName: (name) =>
    set((state) => {
      if (!state.workflow) return state
      return { workflow: { ...state.workflow, name } }
    }),

  addNode: (node, context) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow
      const { sourceNodeId, sourceHandle, targetNodeId } = context

      const newNodes = [...wf.nodes, { ...node, position: { x: 0, y: 0 } }]
      let newEdges = [...wf.edges]

      if (targetNodeId) {
        // Split existing edge: remove source→target, add source→new and new→target
        newEdges = newEdges.filter(
          (e) => !(e.source === sourceNodeId && e.target === targetNodeId &&
            (!sourceHandle || e.sourceHandle === sourceHandle || (!e.sourceHandle && sourceHandle === 'main')))
        )
        newEdges.push({
          id: `e-${Date.now()}-a`,
          source: sourceNodeId,
          target: node.id,
          sourceHandle: sourceHandle !== 'main' ? sourceHandle : undefined,
          type: sourceHandle === 'true' || sourceHandle === 'false' ? 'branch' : sourceHandle === 'loopBody' ? 'loop' : undefined,
          label: sourceHandle === 'true' ? 'True' : sourceHandle === 'false' ? 'False' : sourceHandle === 'loopBody' ? 'Loop' : undefined,
        })
        newEdges.push({
          id: `e-${Date.now()}-b`,
          source: node.id,
          target: targetNodeId,
        })
      } else {
        // Append: just add source→new edge
        newEdges.push({
          id: `e-${Date.now()}`,
          source: sourceNodeId,
          target: node.id,
          sourceHandle: sourceHandle !== 'main' ? sourceHandle : undefined,
          type: sourceHandle === 'true' || sourceHandle === 'false' ? 'branch' : sourceHandle === 'loopBody' ? 'loop' : undefined,
          label: sourceHandle === 'true' ? 'True' : sourceHandle === 'false' ? 'False' : sourceHandle === 'loopBody' ? 'Loop' : undefined,
        })
      }

      const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
      const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
      const wfFinal = { ...updatedWf, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wfFinal)

      return { workflow: wfFinal, rfNodes, rfEdges }
    }),

  addIfNode: (ifNode, context) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow
      const { sourceNodeId, sourceHandle, targetNodeId } = context
      const ts = Date.now()
      const mergeId = `merge-${ts}`

      // Auto-create a companion Merge node
      const mergeNode: WorkflowNode = {
        id: mergeId,
        type: 'merge',
        label: 'Merge Branches',
        category: 'flow_control',
        status: 'unconfigured',
        config: { strategy: 'choose_branch' },
        position: { x: 0, y: 0 },
      }

      const newNodes = [...wf.nodes, { ...ifNode, position: { x: 0, y: 0 } }, mergeNode]

      // Remove the edge being split (source → target), if any
      let newEdges = targetNodeId
        ? wf.edges.filter(
            (e) => !(e.source === sourceNodeId && e.target === targetNodeId &&
              (!sourceHandle || e.sourceHandle === sourceHandle || (!e.sourceHandle && sourceHandle === 'main')))
          )
        : [...wf.edges]

      // source → IF
      newEdges.push({
        id: `e-${ts}-1`,
        source: sourceNodeId,
        target: ifNode.id,
        sourceHandle: sourceHandle !== 'main' ? sourceHandle : undefined,
      })
      // IF → Merge (true branch)
      newEdges.push({
        id: `e-${ts}-2`,
        source: ifNode.id,
        target: mergeId,
        sourceHandle: 'true',
        targetHandle: 'branchA',
        type: 'branch',
        label: 'True',
      })
      // IF → Merge (false branch)
      newEdges.push({
        id: `e-${ts}-3`,
        source: ifNode.id,
        target: mergeId,
        sourceHandle: 'false',
        targetHandle: 'branchB',
        type: 'branch',
        label: 'False',
      })
      // Merge → original target (if any)
      if (targetNodeId) {
        newEdges.push({
          id: `e-${ts}-4`,
          source: mergeId,
          target: targetNodeId,
        })
      }

      const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
      const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
      const wfFinal = { ...updatedWf, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wfFinal)

      return { workflow: wfFinal, rfNodes, rfEdges }
    }),

  deleteNode: (nodeId) =>
    set((state) => {
      if (!state.workflow) return state
      const wf = state.workflow

      // Find incoming and outgoing edges
      const incomingEdges = wf.edges.filter((e) => e.target === nodeId)
      const outgoingEdges = wf.edges.filter((e) => e.source === nodeId)

      // Remove the node
      const newNodes = wf.nodes.filter((n) => n.id !== nodeId)

      // Remove all edges involving this node
      let newEdges = wf.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)

      // Reconnect: for each incoming→deleted→outgoing, create incoming→outgoing
      for (const inc of incomingEdges) {
        for (const out of outgoingEdges) {
          newEdges.push({
            id: `e-${Date.now()}-${inc.source}-${out.target}`,
            source: inc.source,
            target: out.target,
            sourceHandle: inc.sourceHandle,
            type: inc.type,
            label: inc.label,
          })
        }
      }

      const updatedWf = { ...wf, nodes: newNodes, edges: newEdges }
      const laidOut = autoLayout(updatedWf.nodes, updatedWf.edges)
      const wfFinal = { ...updatedWf, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wfFinal)

      return {
        workflow: wfFinal,
        rfNodes,
        rfEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        isPanelOpen: state.selectedNodeId === nodeId ? false : state.isPanelOpen,
      }
    }),

  updateNodeConfig: (nodeId, config) =>
    set((state) => {
      if (!state.workflow) return state
      const newNodes = state.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, config } : n
      )
      const updatedWf = { ...state.workflow, nodes: newNodes }
      // Rebuild RF nodes to reflect config changes in data
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers)
      return { workflow: updatedWf, rfNodes }
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => {
      if (!state.workflow) return state
      const newNodes = state.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, status } : n
      )
      const updatedWf = { ...state.workflow, nodes: newNodes }
      const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
      const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers)
      return { workflow: updatedWf, rfNodes }
    }),

  runAutoLayout: () =>
    set((state) => {
      if (!state.workflow) return state
      const laidOut = autoLayout(state.workflow.nodes, state.workflow.edges)
      const wf = { ...state.workflow, nodes: laidOut }
      const { rfNodes, rfEdges } = rebuildRF(wf)
      return { workflow: wf, rfNodes, rfEdges }
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false, selectedNodeId: null }),

  openPicker: (context) => set({ isPickerOpen: true, pickerContext: context }),

  closePicker: () => set({ isPickerOpen: false, pickerContext: null }),

  syncWorkflowFromRF: () =>
    set((state) => {
      if (!state.workflow) return state
      const updatedNodes = fromRFNodes(state.workflow.nodes, state.rfNodes)
      return { workflow: { ...state.workflow, nodes: updatedNodes } }
    }),
}))
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/editorStore.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/editorStore.ts src/stores/editorStore.test.ts
git commit -m "feat: rewrite editorStore for React Flow — edges, auto-layout, RF node/edge sync"
```

---

### Task 5.2: Wire delete action into node components

**Files:**
- Modify: `src/components/workflow/nodes/NodeContent.tsx`
- Modify: `src/components/workflow/nodes/TriggerNode.tsx`
- Modify: `src/components/workflow/nodes/ActionNode.tsx`
- Modify: `src/components/workflow/nodes/FlowControlNode.tsx`

The `onDelete` callback in `NodeContent` needs to call `editorStore.deleteNode`. Since React Flow nodes receive data via props, we'll call the store directly from `NodeContent`.

**Step 1: Update NodeContent to call store's deleteNode**

In `NodeContent.tsx`, import the store and use it:

```typescript
// In NodeContent.tsx — update the onDelete handler
import { useEditorStore } from '@/stores/editorStore'

// Change Props: remove onDelete, add nodeId
interface Props {
  node: WorkflowNode
  stepNumber: string
  isSelected: boolean
}

// Inside component:
export function NodeContent({ node, stepNumber, isSelected }: Props) {
  const deleteNode = useEditorStore((s) => s.deleteNode)
  // ... rest same, but onDelete() becomes deleteNode(node.id)
}
```

Update TriggerNode, ActionNode, FlowControlNode to remove the `onDelete` prop since NodeContent now handles it via the store.

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/workflow/nodes/NodeContent.tsx src/components/workflow/nodes/TriggerNode.tsx src/components/workflow/nodes/ActionNode.tsx src/components/workflow/nodes/FlowControlNode.tsx
git commit -m "feat: wire delete action in node components via editorStore"
```

---

## Phase 6: Page Integration

### Task 6.1: Update workflow-editor.tsx

**Files:**
- Modify: `src/app/routes/workflow-editor.tsx`

**Step 1: Update to use ReactFlowCanvas and new store shape**

Replace the current `WorkflowCanvas` usage with `ReactFlowCanvas`. Key changes:
- Import `ReactFlowCanvas` instead of `WorkflowCanvas`
- Import `ReactFlowProvider` from `@xyflow/react`
- Use `rfNodes`, `rfEdges`, `onNodesChange`, `onEdgesChange` from the store
- Update `handleNodeSelected` to route `if_condition` nodes to `addIfNode()` (auto-scaffold) and all others to `addNode()`
- Update `handleSave` to use `edges` instead of `nodeOrder`
- Add "Auto Layout" button to the toolbar
- Remove `onAddClick` prop (handled by edge "+" buttons now)

```typescript
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
import type { Node } from '@xyflow/react'

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
    closePicker,
    addNode,
    addIfNode,
    deleteNode,
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
            onNodeClick={handleNodeClick}
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
```

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build may fail due to downstream components still referencing `nodeOrder`. We'll fix those in the next tasks.

**Step 3: Commit**

```bash
git add src/app/routes/workflow-editor.tsx
git commit -m "feat: integrate ReactFlowCanvas into workflow editor page"
```

---

### Task 6.2: Update workflowService for edges

**Files:**
- Modify: `src/services/workflowService.ts`
- Modify: `src/hooks/useWorkflows.ts`

**Step 1: Update `saveNodes` to accept edges instead of nodeOrder**

In `workflowService.ts`, change `saveNodes`:

```typescript
async saveNodes(
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<Workflow> {
  return workflowService.update(workflowId, { nodes, edges })
}
```

In `useWorkflows.ts`, update `useSaveWorkflowNodes`:

```typescript
export function useSaveWorkflowNodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workflowId, nodes, edges }: { workflowId: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }) =>
      workflowService.saveNodes(workflowId, nodes, edges),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
```

Also update the `create` method to initialize with `edges: []` instead of `nodeOrder: []`.

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/services/workflowService.ts src/hooks/useWorkflows.ts
git commit -m "feat: update workflowService to save edges instead of nodeOrder"
```

---

### Task 6.3: Update NodePickerModal for edge context

**Files:**
- Modify: `src/components/workflow/NodePickerModal.tsx`

**Step 1: Remove `trueBranchNodeIds`, `falseBranchNodeIds`, `bodyNodeIds` from node creation**

In `handleConfirm`, the created node no longer needs these arrays. It only needs position. The modal stays simple — it creates a plain `WorkflowNode` and emits it via `onSelect`. The caller (`workflow-editor.tsx`) is responsible for routing to `addIfNode()` vs `addNode()` based on node type.

```typescript
function handleConfirm() {
  if (!selectedMeta) return
  const node: WorkflowNode = {
    id: `n-${Date.now()}`,
    type: selectedMeta.type,
    label: selectedMeta.label,
    category: selectedMeta.category,
    status: 'unconfigured',
    config: defaultConfig[selectedMeta.type] ?? {},
    position: { x: 0, y: 0 },
  }
  onSelect(node)
  handleClose()
}
```

Remove the `if_condition` and `loop` special cases that set `trueBranchNodeIds`/`falseBranchNodeIds`/`bodyNodeIds`.

> **Note:** The modal does NOT need to know about `addIfNode` vs `addNode`. That routing is handled in `handleNodeSelected` in `workflow-editor.tsx` (see Task 6.1).

**Step 2: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/workflow/NodePickerModal.tsx
git commit -m "refactor: simplify NodePickerModal — remove branch/loop array initialization"
```

---

### Task 6.4: Update NodeConfigPanel for edges

**Files:**
- Modify: `src/components/workflow/NodeConfigPanel.tsx`

**Step 1: Change `nodeOrder` prop to `edges`**

Update the Props interface:

```typescript
interface Props {
  open: boolean
  onClose: () => void
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
```

Update internal `fieldProps` to pass `edges` instead of `nodeOrder`:

```typescript
const fieldProps = { nodes, edges, currentNodeId: node.id }
```

All config components that accept `fieldProps` will need updating too, but most just pass them through to `VariablePicker`. We'll update `VariablePicker` next.

**Step 2: Commit**

```bash
git add src/components/workflow/NodeConfigPanel.tsx
git commit -m "refactor: update NodeConfigPanel to accept edges instead of nodeOrder"
```

---

### Task 6.5: Update VariablePicker for edge-based traversal

**Files:**
- Modify: `src/components/workflow/VariablePicker.tsx`

**Step 1: Write test for edge-based variable building**

Create: `src/components/workflow/VariablePicker.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { WorkflowNode, WorkflowEdge } from '@/types'

// Test the buildVariableGroups logic extracted as a utility
import { buildVariableGroups } from './VariablePicker'

function makeNode(id: string, type: WorkflowNode['type'] = 'http_request', category: WorkflowNode['category'] = 'action'): WorkflowNode {
  return { id, type, label: `Node ${id}`, category, status: 'configured', config: {} as any, position: { x: 0, y: 0 } }
}

describe('buildVariableGroups (edge-based)', () => {
  it('includes trigger variables', () => {
    const nodes = [makeNode('t', 'schedule_trigger', 'trigger'), makeNode('a')]
    const edges: WorkflowEdge[] = [{ id: 'e1', source: 't', target: 'a' }]
    const groups = buildVariableGroups(nodes, edges, 'a')
    expect(groups[0].stepNumber).toBe('trigger')
  })

  it('includes previous step variables by walking edges backwards', () => {
    const nodes = [makeNode('t', 'schedule_trigger', 'trigger'), makeNode('a'), makeNode('b')]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 't', target: 'a' },
      { id: 'e2', source: 'a', target: 'b' },
    ]
    const groups = buildVariableGroups(nodes, edges, 'b')
    // Should have trigger + step 2 (node a) + utilities
    const stepNumbers = groups.map(g => g.stepNumber)
    expect(stepNumbers).toContain('trigger')
    expect(stepNumbers).toContain('2')
  })

  it('includes loop context for nodes inside a loop', () => {
    const nodes = [
      makeNode('t', 'manual_trigger', 'trigger'),
      makeNode('loop', 'loop', 'flow_control'),
      { ...makeNode('body'), parentId: 'loop', branchType: 'body' as const },
    ]
    const edges: WorkflowEdge[] = [
      { id: 'e1', source: 't', target: 'loop' },
      { id: 'e2', source: 'loop', target: 'body', sourceHandle: 'loopBody', type: 'loop' },
    ]
    const groups = buildVariableGroups(nodes, edges, 'body')
    const hasLoop = groups.some(g => g.stepNumber === 'loop')
    expect(hasLoop).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/workflow/VariablePicker.test.ts`

Expected: FAIL — `buildVariableGroups` signature doesn't match (still expects `nodeOrder`)

**Step 3: Rewrite VariablePicker to use edges**

Update `buildVariableGroups` to walk edges backwards from `currentNodeId` instead of using `nodeOrder`:

```typescript
// Updated signature
export function buildVariableGroups(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  currentNodeId: string
): VariableGroup[] {
  const groups: VariableGroup[] = []

  // Walk backwards through edges to find all ancestor nodes
  const visited = new Set<string>()
  const queue = [currentNodeId]
  const ancestors: string[] = []

  // Build reverse adjacency
  const reverseAdj = new Map<string, WorkflowEdge[]>()
  for (const edge of edges) {
    const list = reverseAdj.get(edge.target) ?? []
    list.push(edge)
    reverseAdj.set(edge.target, list)
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)
    const incomingEdges = reverseAdj.get(nodeId) ?? []
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        ancestors.push(edge.source)
        queue.push(edge.source)
      }
    }
  }

  // $trigger always first
  const triggerNode = nodes.find((n) => n.category === 'trigger' && ancestors.includes(n.id))
  if (triggerNode) {
    groups.push({
      nodeLabel: triggerNode.label,
      stepNumber: 'trigger',
      variables: [
        { expression: '{{ $trigger.json }}', label: 'All trigger data', sampleValue: '{ ... }' },
        { expression: '{{ $trigger.json.body }}', label: 'body', sampleValue: '{ ... }' },
        { expression: '{{ $trigger.json.headers }}', label: 'headers', sampleValue: '{ ... }' },
      ],
    })
  }

  // Previous action/integration steps
  let stepCounter = 1
  for (const nodeId of ancestors) {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.category === 'trigger') continue
    const stepN = ++stepCounter
    groups.push({
      nodeLabel: node.label,
      stepNumber: String(stepN),
      variables: [
        { expression: `{{ $steps[${stepN}].json }}`, label: 'All output', sampleValue: '{ ... }' },
        { expression: `{{ $steps[${stepN}].json.statusCode }}`, label: 'statusCode', sampleValue: '200' },
        { expression: `{{ $steps[${stepN}].json.body }}`, label: 'body', sampleValue: '{ ... }' },
      ],
    })
  }

  // Loop context
  const currentNode = nodes.find((n) => n.id === currentNodeId)
  const isInLoop = currentNode?.parentId && nodes.some(
    (n) => n.id === currentNode.parentId && n.type === 'loop'
  )
  if (isInLoop) {
    groups.push({
      nodeLabel: 'Loop context',
      stepNumber: 'loop',
      variables: [
        { expression: '{{ $item }}', label: 'Current item', sampleValue: '{ ... }' },
        { expression: '{{ $index }}', label: 'Current index', sampleValue: '0' },
      ],
    })
  }

  // Utilities
  groups.push({
    nodeLabel: 'Utilities',
    stepNumber: 'util',
    variables: [
      { expression: '{{ $now }}', label: 'Current timestamp', sampleValue: new Date().toISOString() },
    ],
  })

  return groups
}
```

Update the component props to accept `edges` instead of `nodeOrder`:

```typescript
interface Props {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentNodeId: string
  onInsert: (expression: string) => void
}

export function VariablePicker({ nodes, edges, currentNodeId, onInsert }: Props) {
  const [open, setOpen] = useState(false)
  const groups = buildVariableGroups(nodes, edges, currentNodeId)
  // ... rest unchanged
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/workflow/VariablePicker.test.ts`

Expected: PASS

**Step 5: Update all config components that pass `nodeOrder` to VariablePicker**

Config components that receive `fieldProps` and pass them to `VariablePicker`:
- `src/components/workflow/configs/HttpRequestConfig.tsx`
- `src/components/workflow/configs/IfConditionConfig.tsx`
- `src/components/workflow/configs/SetTransformConfig.tsx`
- `src/components/workflow/configs/LoopConfig.tsx`

In each, rename the `nodeOrder` field prop to `edges`. Specifically, update the `fieldProps` type and the `VariablePicker` call from `nodeOrder={nodeOrder}` to `edges={edges}`.

Also update `ExpressionField.tsx` if it passes `nodeOrder` through.

**Step 6: Verify app builds**

Run: `npm run build`

Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/components/workflow/VariablePicker.tsx src/components/workflow/VariablePicker.test.ts src/components/workflow/ExpressionField.tsx src/components/workflow/configs/HttpRequestConfig.tsx src/components/workflow/configs/IfConditionConfig.tsx src/components/workflow/configs/SetTransformConfig.tsx src/components/workflow/configs/LoopConfig.tsx
git commit -m "feat: update VariablePicker to use edge-based backward traversal"
```

---

## Phase 7: Cleanup

### Task 7.1: Remove old components

**Files:**
- Delete: `src/components/workflow/WorkflowCanvas.tsx`
- Delete: `src/components/workflow/BranchContainer.tsx`
- Delete: `src/components/workflow/LoopContainer.tsx`
- Delete: `src/components/workflow/AddButton.tsx`

**Step 1: Verify no remaining imports of old components**

Search for imports of `WorkflowCanvas`, `BranchContainer`, `LoopContainer`, `AddButton` across the codebase. All should have been replaced in Phase 6.

Run:
```bash
grep -r "WorkflowCanvas\|BranchContainer\|LoopContainer\|AddButton" src/ --include="*.tsx" --include="*.ts" -l
```

Expected: No files listed (or only the files themselves)

**Step 2: Delete the files**

```bash
rm src/components/workflow/WorkflowCanvas.tsx
rm src/components/workflow/BranchContainer.tsx
rm src/components/workflow/LoopContainer.tsx
rm src/components/workflow/AddButton.tsx
```

**Step 3: Verify app builds**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 4: Run all tests**

Run: `npx vitest run`

Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old canvas components (WorkflowCanvas, BranchContainer, LoopContainer, AddButton)"
```

---

### Task 7.2: Update NodeCard (keep as reference or remove)

**Files:**
- Modify or delete: `src/components/workflow/NodeCard.tsx`

The old `NodeCard.tsx` is no longer used directly — its rendering logic was extracted into `NodeContent.tsx`. If nothing else imports it, delete it.

**Step 1: Check for remaining imports**

Run:
```bash
grep -r "NodeCard" src/ --include="*.tsx" --include="*.ts" -l
```

If no imports remain, delete `src/components/workflow/NodeCard.tsx`.

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove unused NodeCard component (replaced by NodeContent)"
```

---

### Task 7.3: Clear localStorage and verify seed data

Since the data format changed (nodeOrder → edges), existing localStorage data will be stale.

**Step 1: Update `src/lib/storage.ts` or seed logic**

In `workflowService.ts`, the `getWorkflows()` function seeds from mock data only if storage is empty. Existing users with old-format data in localStorage will get errors.

Add a migration check: if any stored workflow has `nodeOrder` but not `edges`, clear and re-seed:

```typescript
function getWorkflows(): Workflow[] {
  const stored = storage.getList<Workflow>(STORAGE_KEYS.workflows)
  // Migration: if old format (has nodeOrder), re-seed
  if (stored.length > 0 && 'nodeOrder' in stored[0] && !('edges' in stored[0])) {
    storage.set(STORAGE_KEYS.workflows, seedWorkflows)
    return seedWorkflows
  }
  if (stored.length === 0) {
    storage.set(STORAGE_KEYS.workflows, seedWorkflows)
    return seedWorkflows
  }
  return stored
}
```

**Step 2: Verify by running the app**

Run: `npm run dev`

Open browser, navigate to `/dashboard`, then open a workflow editor. Verify:
- Canvas renders with React Flow
- Nodes appear in left-to-right layout
- Edges connect nodes with "+" buttons at midpoints
- Clicking a node opens the config panel
- Clicking "+" opens the node picker
- Auto Layout button repositions nodes

**Step 3: Commit**

```bash
git add src/services/workflowService.ts
git commit -m "feat: add localStorage migration from nodeOrder to edges format"
```

---

### Task 7.4: Final integration test — all 3 seed workflows

**Step 1: Run the full test suite**

Run: `npx vitest run`

Expected: All tests pass

**Step 2: Manual verification checklist**

Open the dev server and verify:

- [ ] wf-001 (Daily Weather Report): 3 nodes in a line, left-to-right
- [ ] wf-002 (Lead Qualifier): IF node with true branch above, false below, merge at end
- [ ] wf-003 (Bulk Email Sender): Loop node with body node connected via dashed blue edge
- [ ] Click a node → config panel opens
- [ ] Click "+" on an edge → node picker opens
- [ ] Select a node from picker → node inserted, edges re-routed, auto-layout runs
- [ ] Delete a node → edges reconnect, auto-layout runs
- [ ] "Auto Layout" button → nodes reposition
- [ ] Drag a node → position updates (preserved until next add/delete)
- [ ] Save → no errors
- [ ] MiniMap and Controls visible

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete React Flow migration — all seed workflows render correctly"
```

---

## Summary of Files

### New Files (11)
| File | Phase |
|------|-------|
| `src/lib/autoLayout.ts` | 1.3 |
| `src/lib/autoLayout.test.ts` | 1.3 |
| `src/lib/flowUtils.ts` | 1.4 |
| `src/lib/flowUtils.test.ts` | 1.4 |
| `src/components/workflow/nodes/NodeContent.tsx` | 2.1 |
| `src/components/workflow/nodes/TriggerNode.tsx` | 2.2 |
| `src/components/workflow/nodes/ActionNode.tsx` | 2.3 |
| `src/components/workflow/nodes/FlowControlNode.tsx` | 2.4 |
| `src/components/workflow/edges/DefaultEdge.tsx` | 3.1 |
| `src/components/workflow/edges/BranchEdge.tsx` | 3.2 |
| `src/components/workflow/ReactFlowCanvas.tsx` | 4.1 |

### Modified Files (11)
| File | Phase |
|------|-------|
| `package.json` | 1.1 |
| `src/types/workflow.ts` | 1.2 |
| `src/types/index.ts` | 1.2 |
| `src/mocks/workflows.ts` | 1.5 |
| `src/stores/editorStore.ts` | 5.1 |
| `src/app/routes/workflow-editor.tsx` | 6.1 |
| `src/services/workflowService.ts` | 6.2 + 7.3 |
| `src/hooks/useWorkflows.ts` | 6.2 |
| `src/components/workflow/NodePickerModal.tsx` | 6.3 |
| `src/components/workflow/NodeConfigPanel.tsx` | 6.4 |
| `src/components/workflow/VariablePicker.tsx` | 6.5 |

### Deleted Files (5)
| File | Phase |
|------|-------|
| `src/components/workflow/WorkflowCanvas.tsx` | 7.1 |
| `src/components/workflow/BranchContainer.tsx` | 7.1 |
| `src/components/workflow/LoopContainer.tsx` | 7.1 |
| `src/components/workflow/AddButton.tsx` | 7.1 |
| `src/components/workflow/NodeCard.tsx` | 7.2 |

### Test Files (5)
| File | Phase |
|------|-------|
| `src/types/workflow.test.ts` | 1.2 |
| `src/lib/autoLayout.test.ts` | 1.3 |
| `src/lib/flowUtils.test.ts` | 1.4 |
| `src/mocks/workflows.test.ts` | 1.5 |
| `src/stores/editorStore.test.ts` | 5.1 |
