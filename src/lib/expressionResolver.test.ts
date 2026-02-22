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
