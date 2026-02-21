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
    const rfNodes = toRFNodes(nodes, stepNumbers, [])

    expect(rfNodes).toHaveLength(1)
    expect(rfNodes[0].id).toBe('n-1')
    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[0].position).toEqual({ x: 100, y: 200 })
    expect(rfNodes[0].data.workflowNode.id).toBe('n-1')
    expect(rfNodes[0].data.stepNumber).toBe('1')
    expect(rfNodes[0].data.isTerminalNode).toBe(true)
  })

  it('maps node category to React Flow node type', () => {
    const nodes = [
      makeNode('t', 'schedule_trigger', 'trigger'),
      makeNode('a', 'http_request', 'action'),
      makeNode('f', 'if_condition', 'flow_control'),
      makeNode('i', 'telegram_send_message', 'integration'),
    ]
    const stepNumbers = new Map([['t', '1'], ['a', '2'], ['f', '3'], ['i', '4']])
    const rfNodes = toRFNodes(nodes, stepNumbers, [])

    expect(rfNodes[0].type).toBe('trigger')
    expect(rfNodes[1].type).toBe('action')
    expect(rfNodes[2].type).toBe('flowControl')
    expect(rfNodes[3].type).toBe('action') // integrations use action node type
  })

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
