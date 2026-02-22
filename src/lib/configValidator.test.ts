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
