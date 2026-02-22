// src/lib/nodeRunner.ts
// NOTE: AsyncFunction is intentional in runCode() — code nodes execute user-authored
// async JavaScript (like n8n's Function node). The expression resolver uses sync Function.
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as Function

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
    ) as (...args: unknown[]) => Promise<unknown>
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
