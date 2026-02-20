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
