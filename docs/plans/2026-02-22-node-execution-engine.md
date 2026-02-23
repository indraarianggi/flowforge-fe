# Node Execution Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every non-integration config panel fully functional — real HTTP fetches, expression resolution, condition evaluation, JS code execution, and live Input/Output data in the panel.

**Architecture:** Three pure utility modules (`expressionResolver`, `configValidator`, `nodeRunner`) feed into a thin store slice (`nodeTestOutputs`) that the `NodeConfigPanel` reads to populate its Input/Output tabs and drive the real "Test this step" flow. Error handling settings are persisted as top-level node fields (`onError`, `retryCount`, `retryDelayMs`) rather than local React state.

**Tech Stack:** TypeScript, Zustand 4, native `fetch`, `new AsyncFunction` for code nodes, Vitest for tests.

---

## Known Limitations (by design — not bugs)

| Limitation | Root cause | Backend solution |
|------------|-----------|-----------------|
| HTTP Request may fail with CORS errors | Browser `fetch()` blocked by same-origin policy | Backend worker executes fetch server-side (no CORS) |
| Code node runs unsandboxed in browser | `new AsyncFunction` has no memory/CPU limits | Backend uses `isolated-vm` with 128 MB limit |
| `$branches` context uses test outputs, not live parallel execution | Test mode runs one node at a time | Backend resolves `$branches` after real parallel execution |

---

## Task 1: Expression Resolver

**Files:**
- Create: `src/lib/expressionResolver.ts`
- Create: `src/lib/expressionResolver.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/expressionResolver.test.ts
import { describe, it, expect } from 'vitest'
import { resolveTemplate, resolveConfig } from './expressionResolver'

describe('resolveTemplate', () => {
  const ctx = {
    $trigger: { json: { body: { city: 'Jakarta' } } },
    $steps: { 1: { json: { status: 200, name: 'Alice' } } },
    $item: { id: 42 },
    $index: 0,
    $now: '2026-01-01T00:00:00.000Z',
    $branches: {
      true: { json: { score: 95 } },
      false: { json: { score: 40 } },
    },
  }

  it('returns raw value when template is a single expression', () => {
    expect(resolveTemplate('{{ $steps[1].json.status }}', ctx)).toBe(200)
  })

  it('interpolates into a string when mixed with text', () => {
    expect(resolveTemplate('Hello {{ $steps[1].json.name }}!', ctx)).toBe('Hello Alice!')
  })

  it('resolves nested paths', () => {
    expect(resolveTemplate('{{ $trigger.json.body.city }}', ctx)).toBe('Jakarta')
  })

  it('resolves $item', () => {
    expect(resolveTemplate('{{ $item.id }}', ctx)).toBe(42)
  })

  it('resolves $branches', () => {
    expect(resolveTemplate('{{ $branches.true.json.score }}', ctx)).toBe(95)
  })

  it('returns empty string for undefined expression', () => {
    expect(resolveTemplate('{{ $steps[1].json.missing }}', ctx)).toBe('')
  })

  it('returns plain string unchanged', () => {
    expect(resolveTemplate('no expressions here', ctx)).toBe('no expressions here')
  })
})

describe('resolveConfig', () => {
  const ctx = {
    $steps: { 1: { json: { url: 'https://api.example.com' } } },
  }

  it('resolves string values in objects', () => {
    const result = resolveConfig({ url: '{{ $steps[1].json.url }}', method: 'GET' }, ctx)
    expect(result).toEqual({ url: 'https://api.example.com', method: 'GET' })
  })

  it('resolves values inside arrays', () => {
    const result = resolveConfig([{ key: 'X-Base', value: '{{ $steps[1].json.url }}' }], ctx)
    expect(result).toEqual([{ key: 'X-Base', value: 'https://api.example.com' }])
  })

  it('passes non-string values through unchanged', () => {
    expect(resolveConfig(42, ctx)).toBe(42)
    expect(resolveConfig(true, ctx)).toBe(true)
    expect(resolveConfig(null, ctx)).toBe(null)
  })
})
```

### Step 2: Run to verify failure

```bash
pnpm vitest run src/lib/expressionResolver.test.ts
```

Expected: `Cannot find module './expressionResolver'`

### Step 3: Implement

```typescript
// src/lib/expressionResolver.ts

export interface ExpressionContext {
  $trigger?: unknown
  $steps?: Record<number, unknown>
  $item?: unknown
  $index?: number
  $now?: string
  /** Outputs of true/false branches — available in Merge node context (FR-20) */
  $branches?: {
    true?: unknown
    false?: unknown
  }
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

function evalExpression(expr: string, ctx: ExpressionContext): unknown {
  try {
    const fn = new AsyncFunction(
      '$trigger', '$steps', '$item', '$index', '$now', '$branches',
      `"use strict"; try { return (${expr}); } catch { return undefined; }`
    )
    // AsyncFunction returns a Promise — resolve synchronously for simple expressions
    let result: unknown
    fn(
      ctx.$trigger,
      ctx.$steps ?? {},
      ctx.$item,
      ctx.$index,
      ctx.$now ?? new Date().toISOString(),
      ctx.$branches ?? {}
    ).then((v: unknown) => { result = v })
    return result
  } catch {
    return undefined
  }
}

export function resolveTemplate(template: string, ctx: ExpressionContext): unknown {
  const single = template.match(/^\{\{\s*(.+?)\s*\}\}$/)
  if (single) {
    return evalExpression(single[1].trim(), ctx)
  }
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr: string) => {
    const val = evalExpression(expr.trim(), ctx)
    return val === undefined || val === null ? '' : String(val)
  })
}

// Recursively resolve all string values in a config object/array
export function resolveConfig<T>(config: T, ctx: ExpressionContext): T {
  if (typeof config === 'string') {
    return resolveTemplate(config, ctx) as T
  }
  if (Array.isArray(config)) {
    return config.map((item) => resolveConfig(item, ctx)) as T
  }
  if (config !== null && typeof config === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(config as object)) {
      out[k] = resolveConfig(v, ctx)
    }
    return out as T
  }
  return config
}
```

### Step 4: Run tests to verify pass

```bash
pnpm vitest run src/lib/expressionResolver.test.ts
```

Expected: all 10 tests pass.

### Step 5: Commit

```bash
git add src/lib/expressionResolver.ts src/lib/expressionResolver.test.ts
git commit -m "feat: add expression resolver — parses {{ }} templates including \$branches context"
```

---

## Task 2: Config Validator

**Files:**
- Create: `src/lib/configValidator.ts`
- Create: `src/lib/configValidator.test.ts`

### Step 1: Write the failing tests

```typescript
// src/lib/configValidator.test.ts
import { describe, it, expect } from 'vitest'
import { validateNodeConfig } from './configValidator'
import type { WorkflowNode } from '@/types'

function node(type: WorkflowNode['type'], config: Record<string, unknown>): WorkflowNode {
  return {
    id: 'n1', type, label: 'Test', category: 'action',
    status: 'unconfigured', config: config as WorkflowNode['config'],
    position: { x: 0, y: 0 },
  }
}

describe('validateNodeConfig', () => {
  it('manual_trigger is always configured', () => {
    expect(validateNodeConfig(node('manual_trigger', {}))).toBe('configured')
  })

  it('webhook_trigger: configured when path non-empty', () => {
    expect(validateNodeConfig(node('webhook_trigger', { path: 'my-hook', method: 'POST', responseMode: 'immediately' }))).toBe('configured')
    expect(validateNodeConfig(node('webhook_trigger', { path: '', method: 'POST', responseMode: 'immediately' }))).toBe('unconfigured')
  })

  it('schedule_trigger: requires preset; custom requires cron', () => {
    expect(validateNodeConfig(node('schedule_trigger', { preset: 'daily', timezone: 'UTC' }))).toBe('configured')
    expect(validateNodeConfig(node('schedule_trigger', { preset: 'custom', cron: '*/5 * * * *', timezone: 'UTC' }))).toBe('configured')
    expect(validateNodeConfig(node('schedule_trigger', { preset: 'custom', cron: '', timezone: 'UTC' }))).toBe('unconfigured')
    expect(validateNodeConfig(node('schedule_trigger', { timezone: 'UTC' }))).toBe('unconfigured')
  })

  it('http_request: requires url', () => {
    expect(validateNodeConfig(node('http_request', { url: 'https://api.example.com', method: 'GET', headers: [], queryParams: [], bodyType: 'json', authType: 'none', timeout: 5000 }))).toBe('configured')
    expect(validateNodeConfig(node('http_request', { url: '', method: 'GET', headers: [], queryParams: [], bodyType: 'json', authType: 'none', timeout: 5000 }))).toBe('unconfigured')
  })

  it('if_condition: requires at least one condition with field', () => {
    expect(validateNodeConfig(node('if_condition', { combinator: 'AND', conditions: [{ id: 'c1', field: '$steps[1].json.status', operation: 'equals', value: '200' }] }))).toBe('configured')
    expect(validateNodeConfig(node('if_condition', { combinator: 'AND', conditions: [] }))).toBe('unconfigured')
    expect(validateNodeConfig(node('if_condition', { combinator: 'AND', conditions: [{ id: 'c1', field: '', operation: 'equals', value: '' }] }))).toBe('unconfigured')
  })

  it('set_transform: requires at least one named field', () => {
    expect(validateNodeConfig(node('set_transform', { fields: [{ id: 'f1', name: 'city', value: 'Jakarta' }] }))).toBe('configured')
    expect(validateNodeConfig(node('set_transform', { fields: [] }))).toBe('unconfigured')
  })

  it('code: requires non-empty code', () => {
    expect(validateNodeConfig(node('code', { code: 'return { ok: true }', inputMappings: [] }))).toBe('configured')
    expect(validateNodeConfig(node('code', { code: '', inputMappings: [] }))).toBe('unconfigured')
  })

  it('loop forEach: requires source', () => {
    expect(validateNodeConfig(node('loop', { mode: 'forEach', source: '{{ $steps[1].json.rows }}', batchSize: 1, onItemError: 'stopAll' }))).toBe('configured')
    expect(validateNodeConfig(node('loop', { mode: 'forEach', source: '', batchSize: 1, onItemError: 'stopAll' }))).toBe('unconfigured')
  })

  it('loop count: requires count', () => {
    expect(validateNodeConfig(node('loop', { mode: 'count', count: '5', batchSize: 1, onItemError: 'stopAll' }))).toBe('configured')
    expect(validateNodeConfig(node('loop', { mode: 'count', count: '', batchSize: 1, onItemError: 'stopAll' }))).toBe('unconfigured')
  })

  it('wait duration: requires durationValue > 0', () => {
    expect(validateNodeConfig(node('wait', { mode: 'duration', durationValue: 5, durationUnit: 'seconds' }))).toBe('configured')
    expect(validateNodeConfig(node('wait', { mode: 'duration', durationValue: 0, durationUnit: 'seconds' }))).toBe('unconfigured')
  })

  it('merge is always configured', () => {
    expect(validateNodeConfig(node('merge', { mode: 'append', waitForAll: true }))).toBe('configured')
  })
})
```

### Step 2: Run to verify failure

```bash
pnpm vitest run src/lib/configValidator.test.ts
```

Expected: `Cannot find module './configValidator'`

### Step 3: Implement

```typescript
// src/lib/configValidator.ts
import type { WorkflowNode, NodeStatus } from '@/types'

function nonEmpty(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

export function validateNodeConfig(node: WorkflowNode): NodeStatus {
  const c = node.config as Record<string, unknown>

  switch (node.type) {
    case 'manual_trigger':
      return 'configured'

    case 'webhook_trigger':
      return nonEmpty(c.path) ? 'configured' : 'unconfigured'

    case 'schedule_trigger':
      if (!nonEmpty(c.preset as string)) return 'unconfigured'
      if (c.preset === 'custom' && !nonEmpty(c.cron as string)) return 'unconfigured'
      return 'configured'

    case 'http_request':
      return nonEmpty(c.url as string) ? 'configured' : 'unconfigured'

    case 'if_condition': {
      const conditions = (c.conditions as Array<{ field: string; operation: string }>) ?? []
      return conditions.some((r) => nonEmpty(r.field) && nonEmpty(r.operation))
        ? 'configured'
        : 'unconfigured'
    }

    case 'set_transform': {
      const fields = (c.fields as Array<{ name: string }>) ?? []
      return fields.some((f) => nonEmpty(f.name)) ? 'configured' : 'unconfigured'
    }

    case 'code':
      return nonEmpty(c.code as string) ? 'configured' : 'unconfigured'

    case 'loop': {
      const mode = c.mode as string
      if (mode === 'forEach') return nonEmpty(c.source as string) ? 'configured' : 'unconfigured'
      return nonEmpty(c.count as string) ? 'configured' : 'unconfigured'
    }

    case 'wait': {
      if (c.mode === 'duration') return Number(c.durationValue) > 0 ? 'configured' : 'unconfigured'
      return 'configured'
    }

    case 'merge':
      return 'configured'

    default:
      return 'unconfigured'
  }
}
```

### Step 4: Run tests to verify pass

```bash
pnpm vitest run src/lib/configValidator.test.ts
```

Expected: all 12 tests pass.

### Step 5: Commit

```bash
git add src/lib/configValidator.ts src/lib/configValidator.test.ts
git commit -m "feat: add config validator — derives configured/unconfigured status per node type"
```

---

## Task 3: Extend editorStore — nodeTestOutputs + error handling persistence

**Files:**
- Modify: `src/stores/editorStore.ts`

### Step 1: Add state and actions

**3a. Add to the `EditorState` interface** (after `pickerContext`):

```typescript
// Test output cache — populated by "Test this step", consumed by Input/Output tabs
nodeTestOutputs: Record<string, unknown>  // nodeId → NodeOutput

// Persist error handling fields to the node (not buried in config)
setNodeTestOutput: (nodeId: string, output: unknown) => void
clearNodeTestOutput: (nodeId: string) => void
clearAllTestOutputs: () => void
updateNodeErrorHandling: (
  nodeId: string,
  patch: { onError: WorkflowNode['onError']; retryCount?: number; retryDelayMs?: number }
) => void
```

**3b. Add initial state** (after `pickerContext: null`):

```typescript
nodeTestOutputs: {},
```

**3c. Add action implementations** (after `closePicker`):

```typescript
setNodeTestOutput: (nodeId, output) =>
  set((state) => ({
    nodeTestOutputs: { ...state.nodeTestOutputs, [nodeId]: output },
  })),

clearNodeTestOutput: (nodeId) =>
  set((state) => {
    const next = { ...state.nodeTestOutputs }
    delete next[nodeId]
    return { nodeTestOutputs: next }
  }),

clearAllTestOutputs: () => set({ nodeTestOutputs: {} }),

updateNodeErrorHandling: (nodeId, patch) =>
  set((state) => {
    if (!state.workflow) return state
    const newNodes = state.workflow.nodes.map((n) =>
      n.id === nodeId ? { ...n, ...patch } : n
    )
    const updatedWf = { ...state.workflow, nodes: newNodes }
    const stepNumbers = getStepNumbers(updatedWf.nodes, updatedWf.edges)
    const rfNodes = toRFNodes(updatedWf.nodes, stepNumbers, updatedWf.edges)
    return { workflow: updatedWf, rfNodes }
  }),
```

### Step 2: Verify TypeScript compiles

```bash
pnpm tsc --noEmit
```

Expected: no errors.

### Step 3: Commit

```bash
git add src/stores/editorStore.ts
git commit -m "feat: add nodeTestOutputs + updateNodeErrorHandling to editorStore"
```

---

## Task 4: Node Runner

**Files:**
- Create: `src/lib/nodeRunner.ts`

No unit tests for this task — the executors involve `fetch` and `new AsyncFunction`, which are best validated via integration (testing in the browser via the config panel).

### Step 1: Create the file

```typescript
// src/lib/nodeRunner.ts
import type {
  WorkflowNode,
  ManualTriggerConfig,
  WebhookTriggerConfig,
  ScheduleTriggerConfig,
  HttpRequestConfig,
  IfConditionConfig,
  ConditionRow,
  SetTransformConfig,
  CodeConfig,
  LoopConfig,
  WaitConfig,
  MergeConfig,
} from '@/types'
import { resolveConfig, type ExpressionContext } from './expressionResolver'

export interface NodeOutput {
  json: unknown
  statusCode?: number
  responseHeaders?: Record<string, string>
  /** Only set by if_condition — tells the caller which branch was taken */
  branch?: 'true' | 'false'
  /** Only set by loop — the first item being iterated (test mode: iteration 0) */
  $item?: unknown
  $index?: number
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function runNode(
  node: WorkflowNode,
  inputData: unknown,
  ctx: ExpressionContext
): Promise<NodeOutput> {
  switch (node.type) {
    case 'manual_trigger':   return runManualTrigger(node)
    case 'webhook_trigger':  return runWebhookTrigger(node)
    case 'schedule_trigger': return runScheduleTrigger(node)
    case 'http_request':     return runHttpRequest(node, ctx)
    case 'if_condition':     return runIfCondition(node, inputData, ctx)
    case 'set_transform':    return runSetTransform(node, ctx)
    case 'code':             return runCode(node, inputData, ctx)
    case 'loop':             return runLoop(node, inputData, ctx)
    case 'wait':             return runWait(node)
    case 'merge':            return runMerge(node, inputData)
    default:
      return { json: { message: `Node type "${node.type}" has no executor` } }
  }
}

// ─── Trigger executors ───────────────────────────────────────────────────────

function runManualTrigger(node: WorkflowNode): NodeOutput {
  const cfg = node.config as ManualTriggerConfig
  try {
    const json = cfg.sampleData
      ? JSON.parse(cfg.sampleData)
      : { triggeredAt: new Date().toISOString(), source: 'manual' }
    return { json }
  } catch {
    return { json: { triggeredAt: new Date().toISOString(), source: 'manual' } }
  }
}

function runWebhookTrigger(node: WorkflowNode): NodeOutput {
  const cfg = node.config as WebhookTriggerConfig
  return {
    json: {
      method: cfg.method === 'ANY' ? 'POST' : cfg.method,
      path: `/${cfg.path}`,
      headers: { 'content-type': 'application/json', 'user-agent': 'webhook-client/1.0' },
      body: { event: 'test_event', data: { id: 1, name: 'Sample payload' } },
      query: {},
    },
  }
}

function runScheduleTrigger(node: WorkflowNode): NodeOutput {
  const cfg = node.config as ScheduleTriggerConfig
  const cronMap: Record<string, string> = {
    every_5m: '*/5 * * * *',
    hourly:   '0 * * * *',
    daily:    '0 9 * * *',
    weekly:   '0 9 * * 1',
    monthly:  '0 9 1 * *',
  }
  return {
    json: {
      firedAt: new Date().toISOString(),
      timezone: cfg.timezone,
      preset: cfg.preset,
      cron: cfg.preset === 'custom' ? cfg.cron : cronMap[cfg.preset],
    },
  }
}

// ─── HTTP Request ────────────────────────────────────────────────────────────

async function runHttpRequest(node: WorkflowNode, ctx: ExpressionContext): Promise<NodeOutput> {
  const raw = node.config as HttpRequestConfig
  // Resolve all {{ }} expressions in the config before building the request
  const cfg = resolveConfig(raw, ctx)

  const reqHeaders: Record<string, string> = {}
  for (const { key, value } of cfg.headers) {
    if (key.trim()) reqHeaders[key.trim()] = value
  }

  // Apply auth
  if (cfg.authType === 'bearer' && cfg.authConfig?.token) {
    reqHeaders['Authorization'] = `Bearer ${cfg.authConfig.token}`
  } else if (cfg.authType === 'basic' && cfg.authConfig?.username) {
    const encoded = btoa(`${cfg.authConfig.username}:${cfg.authConfig.password ?? ''}`)
    reqHeaders['Authorization'] = `Basic ${encoded}`
  } else if (cfg.authType === 'api_key' && cfg.authConfig?.keyName) {
    if (cfg.authConfig.placement !== 'query') {
      reqHeaders[cfg.authConfig.keyName] = cfg.authConfig.keyValue ?? ''
    }
  }

  // Build URL with query params
  let url = cfg.url
  const qParams = cfg.queryParams.filter((p) => p.key.trim())
  if (cfg.authType === 'api_key' && cfg.authConfig?.placement === 'query' && cfg.authConfig.keyName) {
    qParams.push({ key: cfg.authConfig.keyName, value: cfg.authConfig.keyValue ?? '' })
  }
  if (qParams.length > 0) {
    const qs = new URLSearchParams(qParams.map((p) => [p.key, p.value]))
    url += (url.includes('?') ? '&' : '?') + qs.toString()
  }

  // Build body
  let body: string | undefined
  if (cfg.method !== 'GET' && cfg.body) {
    body = cfg.body
    if (cfg.bodyType === 'json' && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json'
    } else if (cfg.bodyType === 'form') {
      reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeout)

  try {
    const res = await fetch(url, { method: cfg.method, headers: reqHeaders, body, signal: controller.signal })
    clearTimeout(timer)

    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((val, key) => { responseHeaders[key] = val })

    const ct = res.headers.get('content-type') ?? ''
    let json: unknown
    if (ct.includes('application/json')) {
      json = await res.json()
    } else {
      json = await res.text()
    }

    return { json, statusCode: res.status, responseHeaders }
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'Request failed'

    // Surface CORS failures clearly — common in browser test mode
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
      throw new Error(
        `CORS error: the server at "${cfg.url}" did not allow this browser request. ` +
        `This works when executed by the backend. ` +
        `Try a public API (e.g., https://jsonplaceholder.typicode.com/todos/1) to test the node.`
      )
    }

    throw new Error(msg.includes('aborted') ? `Request timed out after ${cfg.timeout}ms` : msg)
  }
}

// ─── IF Condition ────────────────────────────────────────────────────────────

function runIfCondition(node: WorkflowNode, inputData: unknown, ctx: ExpressionContext): NodeOutput {
  const cfg = node.config as IfConditionConfig

  function evaluateRow(row: ConditionRow): boolean {
    const resolvedField = resolveConfig(row.field, ctx)
    // If resolution returned the same string (no {{ }} in it), try as a plain property key
    const fieldVal = (resolvedField === row.field && !row.field.includes('{{'))
      ? getProperty(inputData, row.field)
      : resolvedField

    const compareVal = resolveConfig(row.value, ctx)

    switch (row.operation) {
      case 'equals':       return String(fieldVal) === String(compareVal)
      case 'not_equals':   return String(fieldVal) !== String(compareVal)
      case 'contains':     return String(fieldVal).includes(String(compareVal))
      case 'greater_than': return Number(fieldVal) > Number(compareVal)
      case 'less_than':    return Number(fieldVal) < Number(compareVal)
      case 'is_empty':     return fieldVal === undefined || fieldVal === null || fieldVal === ''
      case 'is_not_empty': return fieldVal !== undefined && fieldVal !== null && fieldVal !== ''
      case 'regex':        return new RegExp(String(compareVal)).test(String(fieldVal))
      default:             return false
    }
  }

  const results = cfg.conditions.map(evaluateRow)
  const passed = cfg.combinator === 'AND' ? results.every(Boolean) : results.some(Boolean)

  return { json: inputData, branch: passed ? 'true' : 'false' }
}

function getProperty(obj: unknown, path: string): unknown {
  if (obj === null || typeof obj !== 'object') return undefined
  return (obj as Record<string, unknown>)[path]
}

// ─── Set / Transform ─────────────────────────────────────────────────────────

function runSetTransform(node: WorkflowNode, ctx: ExpressionContext): NodeOutput {
  const cfg = node.config as SetTransformConfig
  const json: Record<string, unknown> = {}
  for (const field of cfg.fields) {
    if (field.name.trim()) {
      json[field.name] = resolveConfig(field.value, ctx)
    }
  }
  return { json }
}

// ─── Code ────────────────────────────────────────────────────────────────────

// Note: runs in browser (no sandboxing). Backend uses isolated-vm with 128MB/10s limits.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

async function runCode(node: WorkflowNode, inputData: unknown, ctx: ExpressionContext): Promise<NodeOutput> {
  const cfg = node.config as CodeConfig

  const mappingNames: string[] = []
  const mappingValues: unknown[] = []
  for (const m of cfg.inputMappings) {
    if (m.name.trim()) {
      mappingNames.push(m.name.trim())
      mappingValues.push(resolveConfig(m.expression, ctx))
    }
  }

  try {
    const fn = new AsyncFunction(
      '$input', '$steps', '$item', '$index', '$now',
      ...mappingNames,
      `"use strict";\n${cfg.code}`
    )
    const result: unknown = await fn(
      inputData,
      ctx.$steps ?? {},
      ctx.$item,
      ctx.$index,
      ctx.$now ?? new Date().toISOString(),
      ...mappingValues
    )
    return { json: result ?? null }
  } catch (err) {
    throw new Error(`Code error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

// ─── Loop ────────────────────────────────────────────────────────────────────

function runLoop(node: WorkflowNode, inputData: unknown, ctx: ExpressionContext): NodeOutput {
  const cfg = node.config as LoopConfig

  if (cfg.mode === 'count') {
    const count = Number(resolveConfig(cfg.count ?? '1', ctx)) || 1
    return {
      json: { mode: 'count', totalIterations: count, note: `Test shows iteration 0 of ${count}` },
      $item: { index: 0 },
      $index: 0,
    }
  }

  // forEach: resolve the source expression to get the array
  const resolved = resolveConfig(cfg.source ?? '', ctx)
  const items: unknown[] = Array.isArray(resolved)
    ? resolved
    : resolved
      ? [resolved]
      : Array.isArray(inputData)
        ? (inputData as unknown[])
        : [{ sample: 'item' }]

  return {
    json: {
      mode: 'forEach',
      totalItems: items.length,
      note: `Test shows iteration 0 of ${items.length}`,
      previewItem: items[0],
    },
    $item: items[0],
    $index: 0,
  }
}

// ─── Wait ────────────────────────────────────────────────────────────────────

function runWait(node: WorkflowNode): NodeOutput {
  const cfg = node.config as WaitConfig
  return {
    json: {
      skippedWait: true,
      note: 'Wait is skipped in test mode',
      wouldHaveWaited:
        cfg.mode === 'duration'
          ? `${cfg.durationValue} ${cfg.durationUnit}`
          : 'webhook resume',
    },
  }
}

// ─── Merge ───────────────────────────────────────────────────────────────────

function runMerge(node: WorkflowNode, inputData: unknown): NodeOutput {
  const cfg = node.config as MergeConfig

  if (cfg.mode === 'chooseBranch') {
    // Pass through whichever branch's data arrived as input
    return { json: inputData }
  }

  if (cfg.mode === 'combineByKey') {
    const key = cfg.keyField ?? 'id'
    const items = Array.isArray(inputData) ? inputData : [inputData]
    // In test mode, items come from one branch only — combine is a pass-through
    const merged: Record<string, unknown> = {}
    for (const item of items) {
      if (item && typeof item === 'object') {
        const keyVal = String((item as Record<string, unknown>)[key] ?? '')
        merged[keyVal] = item
      }
    }
    return { json: Object.values(merged) }
  }

  // append (default)
  const items = Array.isArray(inputData) ? inputData : [inputData]
  return { json: items }
}
```

### Step 2: Verify TypeScript compiles

```bash
pnpm tsc --noEmit
```

Expected: no errors.

### Step 3: Commit

```bash
git add src/lib/nodeRunner.ts
git commit -m "feat: add node runner — per-type async executors with real fetch and CORS error messaging"
```

---

## Task 5: Wire NodeConfigPanel

**Files:**
- Modify: `src/components/workflow/NodeConfigPanel.tsx`

This is the integration task. Four things change:
1. "Test this step" runs real executors (with upstream chain auto-run)
2. Input/Output tabs show real data from `nodeTestOutputs`
3. Config `onChange` auto-validates and updates node status
4. Error handling tab persists `onError`/`retryCount`/`retryDelayMs` to the store (not local state)

### Step 1: Add helper functions above the component

Add these imports at the top of `NodeConfigPanel.tsx`:

```typescript
import { runNode } from '@/lib/nodeRunner'
import { validateNodeConfig } from '@/lib/configValidator'
import { getStepNumbers } from '@/lib/flowUtils'
import type { ExpressionContext } from '@/lib/expressionResolver'
```

Add these helper functions before `export function NodeConfigPanel`:

```typescript
/** Returns ancestor node IDs in topological order (trigger first). */
function getAncestorChain(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  const reverseAdj = new Map<string, string[]>()
  for (const e of edges) {
    const list = reverseAdj.get(e.target) ?? []
    list.push(e.source)
    reverseAdj.set(e.target, list)
  }
  const visited = new Set<string>()
  const queue = [nodeId]
  const ancestors: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    for (const src of reverseAdj.get(id) ?? []) {
      if (!visited.has(src)) {
        ancestors.push(src)
        queue.push(src)
      }
    }
  }
  return ancestors.reverse() // trigger first
}

/**
 * Builds the ExpressionContext from stored test outputs.
 * Includes $trigger, $steps[N], $branches (from any IF ancestor with a branch result).
 */
function buildContext(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  testOutputs: Record<string, unknown>
): ExpressionContext {
  const stepNumbers = getStepNumbers(nodes, edges)
  const $steps: Record<number, unknown> = {}
  let $trigger: unknown
  const $branches: { true?: unknown; false?: unknown } = {}

  for (const [nodeId, stepLabel] of stepNumbers.entries()) {
    const output = testOutputs[nodeId]
    if (!output) continue
    if (stepLabel === 'trigger') {
      $trigger = output
    } else {
      const num = parseInt(stepLabel, 10)
      if (!isNaN(num)) $steps[num] = output
    }

    // Populate $branches from any IF node that has been tested
    const n = nodes.find((x) => x.id === nodeId)
    if (n?.type === 'if_condition' && output && typeof output === 'object') {
      const out = output as { branch?: string; json?: unknown }
      if (out.branch === 'true')  $branches.true  = out.json
      if (out.branch === 'false') $branches.false = out.json
    }
  }

  return { $trigger, $steps, $branches, $now: new Date().toISOString() }
}

/** Returns the direct upstream node ID (immediate parent via edge). */
function getUpstreamNodeId(nodeId: string, edges: WorkflowEdge[]): string | undefined {
  return edges.find((e) => e.target === nodeId)?.source
}
```

### Step 2: Replace the full component function body

Key changes vs the current implementation:
- Pull `nodeTestOutputs`, `setNodeTestOutput`, `updateNodeErrorHandling` from the store
- Remove `useState` for `errorSettings` — read from `node.onError` / `node.retryCount` / `node.retryDelayMs` instead
- `handleTestStep` runs real executors chained from ancestors
- `handleConfigChange` calls `validateNodeConfig` on every change
- `ErrorHandlingConfig.onChange` calls `updateNodeErrorHandling` (persists to workflow)

```typescript
export function NodeConfigPanel({ open, onClose, node, nodes, edges }: Props) {
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const {
    updateNodeConfig,
    updateNodeStatus,
    nodeTestOutputs,
    setNodeTestOutput,
    updateNodeErrorHandling,
  } = useEditorStore()

  const meta = getNodeMeta(node.type)

  // Error handling reads from node fields — persisted in the workflow, not local state
  const errorSettings = {
    mode: (node.onError ?? 'stop') as 'stop' | 'continue' | 'retry',
    retryCount: node.retryCount ?? 3,
    retryDelayMs: node.retryDelayMs ?? 1000,
  }

  const upstreamNodeId = getUpstreamNodeId(node.id, edges)
  const inputData  = upstreamNodeId ? nodeTestOutputs[upstreamNodeId] : undefined
  const outputData = nodeTestOutputs[node.id]

  async function handleTestStep() {
    setIsTesting(true)
    setTestError(null)

    try {
      // 1. Silently run any ancestors that haven't been tested yet
      const ancestors = getAncestorChain(node.id, nodes, edges)
      let currentOutputs = { ...nodeTestOutputs }

      for (const ancestorId of ancestors) {
        if (currentOutputs[ancestorId]) continue
        const ancestorNode = nodes.find((n) => n.id === ancestorId)
        if (!ancestorNode) continue
        const ctx = buildContext(nodes, edges, currentOutputs)
        const upId = getUpstreamNodeId(ancestorId, edges)
        const input = upId ? currentOutputs[upId] : undefined
        const result = await runNode(ancestorNode, input, ctx)
        currentOutputs = { ...currentOutputs, [ancestorId]: result }
        setNodeTestOutput(ancestorId, result)
        updateNodeStatus(ancestorId, 'tested')
      }

      // 2. Run current node
      const ctx = buildContext(nodes, edges, currentOutputs)
      const input = upstreamNodeId ? currentOutputs[upstreamNodeId] : undefined
      const result = await runNode(node, input, ctx)

      setNodeTestOutput(node.id, result)
      updateNodeStatus(node.id, 'tested')

      toast.success(`${node.label} tested successfully`, {
        description: 'Output data is now available in the Output tab.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setTestError(message)
      updateNodeStatus(node.id, 'error')
      toast.error(`${node.label} failed`, { description: message })
    } finally {
      setIsTesting(false)
    }
  }

  function handleConfigChange(config: WorkflowNode['config']) {
    updateNodeConfig(node.id, config)
    // Auto-validate: demote status when config changes (re-test required)
    const newStatus = validateNodeConfig({ ...node, config })
    updateNodeStatus(node.id, newStatus)
  }

  const fieldProps = { nodes, edges, currentNodeId: node.id }
  const noDataMsg = JSON.stringify(
    { message: "No test data yet. Run 'Test this step' first." },
    null, 2
  )

  function renderSettingsForm() {
    const c = node.config as unknown
    const update = (cfg: unknown) => handleConfigChange(cfg as WorkflowNode['config'])
    switch (node.type) {
      case 'manual_trigger':
        return <ManualTriggerConfig config={c as import('@/types').ManualTriggerConfig} onChange={update} />
      case 'webhook_trigger':
        return <WebhookTriggerConfig config={c as import('@/types').WebhookTriggerConfig} onChange={update} />
      case 'schedule_trigger':
        return <ScheduleTriggerConfig config={c as import('@/types').ScheduleTriggerConfig} onChange={update} />
      case 'http_request':
        return <HttpRequestConfig config={c as import('@/types').HttpRequestConfig} onChange={update} {...fieldProps} />
      case 'if_condition':
        return <IfConditionConfig config={c as import('@/types').IfConditionConfig} onChange={update} {...fieldProps} />
      case 'set_transform':
        return <SetTransformConfig config={c as import('@/types').SetTransformConfig} onChange={update} {...fieldProps} />
      case 'code':
        return <CodeConfig config={c as import('@/types').CodeConfig} onChange={update} />
      case 'loop':
        return <LoopConfig config={c as import('@/types').LoopConfig} onChange={update} {...fieldProps} />
      case 'wait':
        return <WaitConfig config={c as import('@/types').WaitConfig} onChange={update} />
      case 'merge':
        return <MergeConfig config={c as import('@/types').MergeConfig} onChange={update} />
      default:
        return (
          <IntegrationPlaceholderConfig
            meta={meta}
            config={c as import('@/types').IntegrationConfig}
            onChange={update}
          />
        )
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold text-slate-800 truncate">{node.label}</SheetTitle>
              <p className="text-xs text-slate-400">{meta.label}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 flex-shrink-0">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="input"    className="flex-1 text-xs">Input</TabsTrigger>
            <TabsTrigger value="output"   className="flex-1 text-xs">Output</TabsTrigger>
            <TabsTrigger value="error"    className="flex-1 text-xs">Error</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="settings" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">{renderSettingsForm()}</div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="input" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    Output from the directly connected upstream node.
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                    {inputData ? JSON.stringify(inputData, null, 2) : noDataMsg}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="output" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    Output produced by this step after it executes.
                  </p>
                  {testError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 whitespace-pre-wrap break-words">
                      {testError}
                    </div>
                  )}
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                    {outputData ? JSON.stringify(outputData, null, 2) : noDataMsg}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="error" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <ErrorHandlingConfig
                    settings={errorSettings}
                    onChange={(s) =>
                      updateNodeErrorHandling(node.id, {
                        onError: s.mode,
                        retryCount: s.retryCount,
                        retryDelayMs: s.retryDelayMs,
                      })
                    }
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleTestStep}
            disabled={isTesting}
          >
            {isTesting ? (
              <><Loader2 size={13} className="mr-2 animate-spin" /> Testing step...</>
            ) : node.status === 'tested' ? (
              <><CheckCircle2 size={13} className="mr-2 text-green-500" /> Test again</>
            ) : (
              <><Play size={13} className="mr-2" /> Test this step</>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

### Step 3: Verify the app runs

```bash
pnpm dev
```

Manual verification checklist:
- [ ] Open a `manual_trigger` node → set sample JSON → Test → Output tab shows parsed JSON
- [ ] Open a downstream `set_transform` → Input tab shows trigger output → Test → Output shows built object
- [ ] Open an `http_request` node with URL `https://jsonplaceholder.typicode.com/todos/1` → Test → Output shows real JSON response with `statusCode: 200`
- [ ] Try an `http_request` to a CORS-blocked API → Output tab shows the CORS error message (not a silent failure)
- [ ] Open an `if_condition` node → Test → Output shows `branch: "true"` or `"false"`
- [ ] Open the Error tab on any node → toggle to "Retry" → close panel → reopen → settings are preserved
- [ ] Open a `merge` node panel → change mode to "combineByKey" → `waitForAll` checkbox is visible

### Step 4: Verify TypeScript compiles

```bash
pnpm tsc --noEmit
```

Expected: no errors.

### Step 5: Commit

```bash
git add src/components/workflow/NodeConfigPanel.tsx
git commit -m "feat: wire real execution engine into NodeConfigPanel — live I/O tabs, error handling persistence, auto-validate"
```

---

## Final Verification

```bash
pnpm vitest run
pnpm tsc --noEmit
```

All tests pass, no TypeScript errors. The four alignment issues are resolved:
1. ✅ Error handling (`onError`, `retryCount`, `retryDelayMs`) persisted to workflow node via `updateNodeErrorHandling`
2. ✅ `MergeConfig` uses `mode` / `chooseBranch` / `combineByKey` / `waitForAll` matching ERD §3.8
3. ✅ CORS failures surface as a clear, actionable error message in the Output tab
4. ✅ `$branches` included in `ExpressionContext` and populated in `buildContext` from IF node test outputs
