// src/components/workflow/NodeConfigPanel.tsx
import { useState } from "react"
import { X, Play, Loader2, CheckCircle2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { delay } from "@/lib/delay"
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

interface Props {
  open: boolean
  onClose: () => void
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export function NodeConfigPanel({ open, onClose, node, nodes, edges }: Props) {
  const [isTesting, setIsTesting] = useState(false)
  const { updateNodeConfig, updateNodeStatus } = useEditorStore()
  const meta = getNodeMeta(node.type)

  const [errorSettings, setErrorSettings] = useState({
    mode: "stop" as "stop" | "continue" | "retry",
    retryCount: 3,
    retryDelayMs: 1000,
  })

  async function handleTestStep() {
    setIsTesting(true)
    await delay(800 + Math.random() * 800)
    updateNodeStatus(node.id, "tested")
    setIsTesting(false)
    toast.success(`${node.label} tested successfully`, {
      description: "Output data is now available for downstream steps.",
    })
  }

  const fieldProps = { nodes, edges, currentNodeId: node.id }

  function renderSettingsForm() {
    const config = node.config as Record<string, unknown>
    const update = (c: unknown) => updateNodeConfig(node.id, c as WorkflowNode["config"])

    // Double-cast through unknown to safely narrow the union config type per node
    const c = config as unknown
    switch (node.type) {
      case "manual_trigger":
        return <ManualTriggerConfig config={c as import("@/types").ManualTriggerConfig} onChange={update} />
      case "webhook_trigger":
        return <WebhookTriggerConfig config={c as import("@/types").WebhookTriggerConfig} onChange={update} />
      case "schedule_trigger":
        return <ScheduleTriggerConfig config={c as import("@/types").ScheduleTriggerConfig} onChange={update} />
      case "http_request":
        return <HttpRequestConfig config={c as import("@/types").HttpRequestConfig} onChange={update} {...fieldProps} />
      case "if_condition":
        return <IfConditionConfig config={c as import("@/types").IfConditionConfig} onChange={update} {...fieldProps} />
      case "set_transform":
        return <SetTransformConfig config={c as import("@/types").SetTransformConfig} onChange={update} {...fieldProps} />
      case "code":
        return <CodeConfig config={c as import("@/types").CodeConfig} onChange={update} />
      case "loop":
        return <LoopConfig config={c as import("@/types").LoopConfig} onChange={update} {...fieldProps} />
      case "wait":
        return <WaitConfig config={c as import("@/types").WaitConfig} onChange={update} />
      case "merge":
        return <MergeConfig config={c as import("@/types").MergeConfig} onChange={update} />
      default:
        return (
          <IntegrationPlaceholderConfig
            meta={meta}
            config={c as import("@/types").IntegrationConfig}
            onChange={update}
          />
        )
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[400px] p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold text-slate-800 truncate">
                {node.label}
              </SheetTitle>
              <p className="text-xs text-slate-400">{meta.label}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 flex-shrink-0">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="input" className="flex-1 text-xs">Input</TabsTrigger>
            <TabsTrigger value="output" className="flex-1 text-xs">Output</TabsTrigger>
            <TabsTrigger value="error" className="flex-1 text-xs">Error</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="settings" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {renderSettingsForm()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="input" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    Input data received by this step from the previous step.
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto">
                    {JSON.stringify({ message: "No test data yet. Run 'Test This Step' first." }, null, 2)}
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="output" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    Output data produced by this step after it executes.
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto">
                    {node.status === "tested"
                      ? JSON.stringify({ result: "ok", timestamp: new Date().toISOString() }, null, 2)
                      : JSON.stringify({ message: "No test data yet. Run 'Test This Step' first." }, null, 2)
                    }
                  </pre>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="error" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <ErrorHandlingConfig settings={errorSettings} onChange={(s) => setErrorSettings({ mode: s.mode, retryCount: s.retryCount ?? 3, retryDelayMs: s.retryDelayMs ?? 1000 })} />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer: Test Step button */}
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
            ) : node.status === "tested" ? (
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
