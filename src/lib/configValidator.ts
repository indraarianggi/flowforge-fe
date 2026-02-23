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
