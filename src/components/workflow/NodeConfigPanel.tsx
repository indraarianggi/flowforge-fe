// src/components/workflow/NodeConfigPanel.tsx
import { useState } from "react"
import { Play, Loader2, CheckCircle2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { getNodeMeta } from "./nodeTypes"
import { ManualTriggerConfig } from "./configs/ManualTriggerConfig"
import { WebhookTriggerConfig } from "./configs/WebhookTriggerConfig"
import { ScheduleTriggerConfig } from "./configs/ScheduleTriggerConfig"
import { HttpRequestConfig } from "./configs/HttpRequestConfig"
import { IfConditionConfig } from "./configs/IfConditionConfig"
import { SetTransformConfig } from "./configs/SetTransformConfig"
import { CodeConfig } from "./configs/CodeConfig"
import { LoopConfig } from "./configs/LoopConfig"
import { WaitConfig } from "./configs/WaitConfig"
import { MergeConfig } from "./configs/MergeConfig"
import { IntegrationPlaceholderConfig } from "./configs/IntegrationPlaceholderConfig"
import { ErrorHandlingConfig } from "./configs/ErrorHandlingConfig"
import { useEditorStore } from "@/stores/editorStore"
import type { WorkflowNode, WorkflowEdge } from "@/types"
import { runNode } from "@/lib/nodeRunner"
import { validateNodeConfig } from "@/lib/configValidator"
import { getStepNumbers } from "@/lib/flowUtils"
import type { ExpressionContext } from "@/lib/expressionResolver"

interface Props {
  open: boolean
  onClose: () => void
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/** Returns ancestor node IDs in topological order (trigger first). */
function getAncestorChain(
  nodeId: string,
  _nodes: WorkflowNode[],
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
