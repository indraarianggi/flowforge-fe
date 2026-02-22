// src/lib/expressionResolver.ts
// NOTE: new Function() is intentional here — this is a workflow expression evaluator
// (like n8n/Zapier) where users write {{ $steps[1].json.status }} template expressions.
// Expressions run in a sandboxed scope with only the context variables exposed.

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

function evalExpression(expr: string, ctx: ExpressionContext): unknown {
  try {
    // Synchronous Function (not AsyncFunction) — expression resolver evaluates
    // simple property-access paths which don't need async/await.
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      '$trigger', '$steps', '$item', '$index', '$now', '$branches',
      '"use strict"; try { return (' + expr + '); } catch { return undefined; }'
    )
    return fn(
      ctx.$trigger,
      ctx.$steps ?? {},
      ctx.$item,
      ctx.$index,
      ctx.$now ?? new Date().toISOString(),
      ctx.$branches ?? {}
    )
  } catch {
    return undefined
  }
}

export function resolveTemplate(template: string, ctx: ExpressionContext): unknown {
  const single = template.match(/^\{\{\s*(.+?)\s*\}\}$/)
  if (single) {
    const val = evalExpression(single[1].trim(), ctx)
    return val === undefined || val === null ? '' : val
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
