# Phase 8: Node Config Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete right-drawer Node Config panel with all 4 tabs (Settings, Input, Output, Error Handling) and fully implemented Settings forms for every node type except integration nodes (Telegram, Google Sheets) which use a placeholder.

**Architecture:** A `NodeConfigPanel` drawer (shadcn Sheet) renders a dynamic form based on the selected node's type. Each node type has its own `*Config` form component. The `VariablePicker` popup lets users insert `{{ $steps[N].json.field }}` expressions. Changes are applied to the `editorStore` immediately (live). "Test This Step" is a mock action that delays then marks the node as "tested".

**Tech Stack:** shadcn/ui Sheet + Tabs, React Hook Form, Zod, CodeMirror 6, Zustand, Lucide React

---

### Task 1: Install CodeMirror 6

**Step 1: Install packages**
```bash
npm install @codemirror/view @codemirror/state @codemirror/lang-javascript @codemirror/theme-one-dark @uiw/react-codemirror
```

---

### Task 2: Build VariablePicker Component

**Files:**
- Create: `src/components/workflow/VariablePicker.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/VariablePicker.tsx
import { useState } from "react"
import { ChevronDown, Variable } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { getNodeMeta } from "./nodeTypes"
import type { WorkflowNode } from "@/types"

interface Variable {
  expression: string
  label: string
  sampleValue: string
}

interface VariableGroup {
  nodeLabel: string
  stepNumber: string
  variables: Variable[]
}

function buildVariableGroups(
  nodes: WorkflowNode[],
  nodeOrder: string[],
  currentNodeId: string
): VariableGroup[] {
  const currentIdx = nodeOrder.indexOf(currentNodeId)
  const previousNodeIds = nodeOrder.slice(0, currentIdx)

  const groups: VariableGroup[] = []

  // $trigger always available
  const triggerNode = nodes.find((n) => n.category === "trigger")
  if (triggerNode) {
    groups.push({
      nodeLabel: triggerNode.label,
      stepNumber: "trigger",
      variables: [
        { expression: "{{ $trigger.json }}", label: "All trigger data", sampleValue: "{ ... }" },
        { expression: "{{ $trigger.json.body }}", label: "body", sampleValue: "{ ... }" },
        { expression: "{{ $trigger.json.headers }}", label: "headers", sampleValue: "{ ... }" },
      ],
    })
  }

  // Previous steps
  previousNodeIds.forEach((nodeId, idx) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.category === "trigger") return
    const stepN = idx + 1
    groups.push({
      nodeLabel: node.label,
      stepNumber: String(stepN),
      variables: [
        { expression: `{{ $steps[${stepN}].json }}`, label: "All output", sampleValue: "{ ... }" },
        { expression: `{{ $steps[${stepN}].json.statusCode }}`, label: "statusCode", sampleValue: "200" },
        { expression: `{{ $steps[${stepN}].json.body }}`, label: "body", sampleValue: "{ ... }" },
      ],
    })
  })

  // Loop context variables if inside a loop
  const isInLoop = nodes.some(
    (n) => n.type === "loop" && n.bodyNodeIds?.includes(currentNodeId)
  )
  if (isInLoop) {
    groups.push({
      nodeLabel: "Loop context",
      stepNumber: "loop",
      variables: [
        { expression: "{{ $item }}", label: "Current item", sampleValue: "{ ... }" },
        { expression: "{{ $index }}", label: "Current index", sampleValue: "0" },
      ],
    })
  }

  // Utility
  groups.push({
    nodeLabel: "Utilities",
    stepNumber: "util",
    variables: [
      { expression: "{{ $now }}", label: "Current timestamp", sampleValue: new Date().toISOString() },
    ],
  })

  return groups
}

interface Props {
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
  onInsert: (expression: string) => void
}

export function VariablePicker({ nodes, nodeOrder, currentNodeId, onInsert }: Props) {
  const [open, setOpen] = useState(false)
  const groups = buildVariableGroups(nodes, nodeOrder, currentNodeId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary px-2">
          <Variable size={11} />
          Insert variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-semibold text-slate-600">Available variables</p>
        </div>
        <ScrollArea className="h-64">
          {groups.map((group) => (
            <div key={group.stepNumber}>
              <div className="px-3 py-1.5 bg-slate-50 border-b border-t first:border-t-0">
                <p className="text-xs font-semibold text-slate-500">{group.nodeLabel}</p>
              </div>
              {group.variables.map((v) => (
                <button
                  key={v.expression}
                  onClick={() => { onInsert(v.expression); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-800">{v.label}</p>
                    <p className="text-xs text-slate-400 font-mono">{v.expression}</p>
                  </div>
                  <span className="text-xs text-slate-400 truncate max-w-20">{v.sampleValue}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No variables available from previous steps
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
```

---

### Task 3: Build ExpressionField Component

**Files:**
- Create: `src/components/workflow/ExpressionField.tsx`

This is a reusable text input that has the "Insert variable" button next to it, used across all node config forms.

**Step 1: Write the component**
```tsx
// src/components/workflow/ExpressionField.tsx
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { VariablePicker } from "./VariablePicker"
import type { WorkflowNode } from "@/types"

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
}

export function ExpressionField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  nodes,
  nodeOrder,
  currentNodeId,
}: Props) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  function handleInsert(expression: string) {
    const el = inputRef.current
    if (!el) {
      onChange(value + expression)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const newValue = value.slice(0, start) + expression + value.slice(end)
    onChange(newValue)
    // Restore cursor position after state update
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + expression.length, start + expression.length)
    }, 0)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <VariablePicker
          nodes={nodes}
          nodeOrder={nodeOrder}
          currentNodeId={currentNodeId}
          onInsert={handleInsert}
        />
      </div>
      {multiline ? (
        <Textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs min-h-20 resize-y"
        />
      ) : (
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  )
}
```

---

### Task 4: Build KeyValueEditor Component

**Files:**
- Create: `src/components/workflow/KeyValueEditor.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/KeyValueEditor.tsx
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Row {
  key: string
  value: string
}

interface Props {
  label: string
  rows: Row[]
  onChange: (rows: Row[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KeyValueEditor({ label, rows, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value" }: Props) {
  function add() {
    onChange([...rows, { key: "", value: "" }])
  }

  function remove(idx: number) {
    onChange(rows.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: "key" | "value", val: string) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={add}>
          <Plus size={11} /> Add row
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No {label.toLowerCase()} added</p>
      )}
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => update(idx, "key", e.target.value)}
            placeholder={keyPlaceholder}
            className="text-xs"
          />
          <Input
            value={row.value}
            onChange={(e) => update(idx, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className="text-xs font-mono"
          />
          <button onClick={() => remove(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

### Task 5: Build Node Config Forms — Triggers

**Files:**
- Create: `src/components/workflow/configs/ManualTriggerConfig.tsx`
- Create: `src/components/workflow/configs/WebhookTriggerConfig.tsx`
- Create: `src/components/workflow/configs/ScheduleTriggerConfig.tsx`

**Step 1: `ManualTriggerConfig.tsx`**
```tsx
// src/components/workflow/configs/ManualTriggerConfig.tsx
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ManualTriggerConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function ManualTriggerConfig({ config, onChange }: Props) {
  const sampleJson = config.sampleData ?? ""

  function handleChange(value: string) {
    onChange({ ...config, sampleData: value })
  }

  function handleValidate() {
    try {
      JSON.parse(sampleJson || "{}")
    } catch {
      return false
    }
    return true
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Sample input data (JSON)</Label>
        <p className="text-xs text-slate-400">
          Optional. Define sample data to use when testing this workflow manually.
        </p>
        <Textarea
          value={sampleJson}
          onChange={(e) => handleChange(e.target.value)}
          placeholder='{\n  "key": "value"\n}'
          className="font-mono text-xs min-h-32 resize-y"
        />
        {sampleJson && !handleValidate() && (
          <p className="text-xs text-destructive">Invalid JSON</p>
        )}
      </div>
      {sampleJson && handleValidate() && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {}}
        >
          Use this sample for variable picker
        </Button>
      )}
    </div>
  )
}
```

**Step 2: `WebhookTriggerConfig.tsx`**
```tsx
// src/components/workflow/configs/WebhookTriggerConfig.tsx
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WebhookTriggerConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function WebhookTriggerConfig({ config, onChange }: Props) {
  const [copied, setCopied] = useState(false)
  const webhookUrl = `https://app.flowforge.dev/webhook/${config.path}`

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Webhook URL</Label>
        <div className="flex items-center gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs bg-slate-50" />
          <button onClick={copyUrl} className="text-slate-400 hover:text-primary flex-shrink-0 transition-colors">
            {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
          </button>
        </div>
        <p className="text-xs text-slate-400">Send HTTP requests to this URL to trigger the workflow.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">HTTP method</Label>
        <Select
          value={config.method}
          onValueChange={(v) => onChange({ ...config, method: v as Config["method"] })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="ANY">Any method</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Response mode</Label>
        <Select
          value={config.responseMode}
          onValueChange={(v) => onChange({ ...config, responseMode: v as Config["responseMode"] })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediately">Respond immediately (202 Accepted)</SelectItem>
            <SelectItem value="after_workflow">Respond after workflow completes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

**Step 3: `ScheduleTriggerConfig.tsx`**
```tsx
// src/components/workflow/configs/ScheduleTriggerConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ScheduleTriggerConfig as Config } from "@/types"

const PRESETS = [
  { value: "every_5m", label: "Every 5 minutes",        cron: "*/5 * * * *" },
  { value: "hourly",   label: "Every hour",             cron: "0 * * * *" },
  { value: "daily",    label: "Every day at 9:00 AM",   cron: "0 9 * * *" },
  { value: "weekly",   label: "Every Monday at 9:00 AM",cron: "0 9 * * 1" },
  { value: "monthly",  label: "1st of every month",     cron: "0 9 1 * *" },
  { value: "custom",   label: "Custom cron expression", cron: "" },
]

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Jakarta", "Asia/Kolkata",
  "Australia/Sydney",
]

function humanReadable(cron: string): string {
  const found = PRESETS.find((p) => p.cron === cron)
  return found ? found.label : `Cron: ${cron}`
}

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function ScheduleTriggerConfig({ config, onChange }: Props) {
  const selectedPreset = PRESETS.find((p) => p.value === config.preset) ?? PRESETS[0]
  const isCustom = config.preset === "custom"

  function handlePresetChange(value: string) {
    const preset = PRESETS.find((p) => p.value === value)!
    onChange({ ...config, preset: value as Config["preset"], cron: preset.cron })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Schedule</Label>
        <Select value={config.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Cron expression</Label>
          <Input
            value={config.cron ?? ""}
            onChange={(e) => onChange({ ...config, cron: e.target.value })}
            placeholder="0 9 * * *"
            className="font-mono text-sm"
          />
          {config.cron && (
            <p className="text-xs text-slate-500">{humanReadable(config.cron)}</p>
          )}
        </div>
      )}

      {!isCustom && config.cron && (
        <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 font-medium">{humanReadable(config.cron)}</p>
          <p className="text-xs text-blue-500 font-mono mt-0.5">{config.cron}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Timezone</Label>
        <Select
          value={config.timezone}
          onValueChange={(v) => onChange({ ...config, timezone: v })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

---

### Task 6: Build Node Config Forms — Action Nodes

**Files:**
- Create: `src/components/workflow/configs/HttpRequestConfig.tsx`
- Create: `src/components/workflow/configs/IfConditionConfig.tsx`
- Create: `src/components/workflow/configs/SetTransformConfig.tsx`
- Create: `src/components/workflow/configs/CodeConfig.tsx`

**Step 1: `HttpRequestConfig.tsx`**
```tsx
// src/components/workflow/configs/HttpRequestConfig.tsx
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { KeyValueEditor } from "../KeyValueEditor"
import { ExpressionField } from "../ExpressionField"
import type { HttpRequestConfig as Config } from "@/types"
import type { WorkflowNode } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
}

export function HttpRequestConfig({ config, onChange, nodes, nodeOrder, currentNodeId }: Props) {
  const fieldProps = { nodes, nodeOrder, currentNodeId }

  return (
    <div className="space-y-4">
      {/* URL */}
      <ExpressionField
        label="URL"
        value={config.url}
        onChange={(url) => onChange({ ...config, url })}
        placeholder="https://api.example.com/endpoint"
        {...fieldProps}
      />

      {/* Method */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Method</Label>
        <Select value={config.method} onValueChange={(v) => onChange({ ...config, method: v as Config["method"] })}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["GET","POST","PUT","DELETE","PATCH"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body / Headers / Params tabs */}
      <Tabs defaultValue="body">
        <TabsList className="w-full">
          <TabsTrigger value="body" className="flex-1 text-xs">Body</TabsTrigger>
          <TabsTrigger value="headers" className="flex-1 text-xs">Headers</TabsTrigger>
          <TabsTrigger value="params" className="flex-1 text-xs">Params</TabsTrigger>
          <TabsTrigger value="auth" className="flex-1 text-xs">Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="space-y-2 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Body type</Label>
            <Select value={config.bodyType} onValueChange={(v) => onChange({ ...config, bodyType: v as Config["bodyType"] })}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form">Form data</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {config.method !== "GET" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Body</Label>
              <Textarea
                value={config.body ?? ""}
                onChange={(e) => onChange({ ...config, body: e.target.value })}
                placeholder={config.bodyType === "json" ? '{\n  "key": "value"\n}' : "key=value"}
                className="font-mono text-xs min-h-28 resize-y"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="headers" className="mt-3">
          <KeyValueEditor
            label="Headers"
            rows={config.headers}
            onChange={(headers) => onChange({ ...config, headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Value"
          />
        </TabsContent>

        <TabsContent value="params" className="mt-3">
          <KeyValueEditor
            label="Query parameters"
            rows={config.queryParams}
            onChange={(queryParams) => onChange({ ...config, queryParams })}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Value"
          />
        </TabsContent>

        <TabsContent value="auth" className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Authentication</Label>
            <Select
              value={config.authType}
              onValueChange={(v) => onChange({ ...config, authType: v as Config["authType"], authConfig: {} })}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer token</SelectItem>
                <SelectItem value="basic">Basic (username / password)</SelectItem>
                <SelectItem value="api_key">API key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.authType === "bearer" && (
            <Input
              value={config.authConfig?.token ?? ""}
              onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, token: e.target.value } })}
              placeholder="Bearer token"
              type="password"
              className="text-sm font-mono"
            />
          )}

          {config.authType === "basic" && (
            <div className="space-y-2">
              <Input
                value={config.authConfig?.username ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, username: e.target.value } })}
                placeholder="Username"
                className="text-sm"
              />
              <Input
                value={config.authConfig?.password ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, password: e.target.value } })}
                placeholder="Password"
                type="password"
                className="text-sm"
              />
            </div>
          )}

          {config.authType === "api_key" && (
            <div className="space-y-2">
              <Input
                value={config.authConfig?.keyName ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, keyName: e.target.value } })}
                placeholder="Key name (e.g. X-API-Key)"
                className="text-sm"
              />
              <Input
                value={config.authConfig?.keyValue ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, keyValue: e.target.value } })}
                placeholder="Key value"
                type="password"
                className="text-sm font-mono"
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Send in</Label>
                <Select
                  value={config.authConfig?.placement ?? "header"}
                  onValueChange={(v) => onChange({ ...config, authConfig: { ...config.authConfig, placement: v } })}
                >
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="query">Query parameter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeout */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Timeout (ms)</Label>
        <Input
          type="number"
          value={config.timeout}
          onChange={(e) => onChange({ ...config, timeout: Number(e.target.value) })}
          min={100}
          max={60000}
          className="text-sm"
        />
      </div>
    </div>
  )
}
```

**Step 2: `IfConditionConfig.tsx`**
```tsx
// src/components/workflow/configs/IfConditionConfig.tsx
import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { IfConditionConfig as Config, ConditionRow } from "@/types"
import type { WorkflowNode } from "@/types"

const OPERATIONS = [
  { value: "equals",       label: "equals",         hasValue: true },
  { value: "not_equals",   label: "does not equal",  hasValue: true },
  { value: "contains",     label: "contains",        hasValue: true },
  { value: "greater_than", label: "is greater than", hasValue: true },
  { value: "less_than",    label: "is less than",    hasValue: true },
  { value: "is_empty",     label: "is empty",        hasValue: false },
  { value: "is_not_empty", label: "is not empty",    hasValue: false },
  { value: "regex",        label: "matches regex",   hasValue: true },
]

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
}

export function IfConditionConfig({ config, onChange, nodes, nodeOrder, currentNodeId }: Props) {
  function addCondition() {
    const row: ConditionRow = {
      id: `c-${Date.now()}`,
      field: "",
      operation: "equals",
      value: "",
    }
    onChange({ ...config, conditions: [...config.conditions, row] })
  }

  function removeCondition(id: string) {
    onChange({ ...config, conditions: config.conditions.filter((c) => c.id !== id) })
  }

  function updateCondition(id: string, patch: Partial<ConditionRow>) {
    onChange({
      ...config,
      conditions: config.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }

  return (
    <div className="space-y-4">
      {/* AND/OR combinator */}
      <div className="flex items-center gap-3">
        <Label className="text-xs font-medium text-slate-600 whitespace-nowrap">Match</Label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["AND", "OR"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ ...config, combinator: opt })}
              className={cn(
                "px-4 py-1.5 text-xs font-medium transition-colors",
                config.combinator === opt
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">of the following conditions</span>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {config.conditions.map((condition, idx) => {
          const opMeta = OPERATIONS.find((o) => o.value === condition.operation)
          return (
            <div key={condition.id} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              {idx > 0 && (
                <span className="text-xs font-semibold text-slate-400 uppercase">{config.combinator}</span>
              )}
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                    placeholder="{{ $steps[1].json.fieldName }}"
                    className="text-xs font-mono"
                  />
                  <Select
                    value={condition.operation}
                    onValueChange={(v) => updateCondition(condition.id, { operation: v as ConditionRow["operation"] })}
                  >
                    <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATIONS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {opMeta?.hasValue && (
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                      placeholder="Value"
                      className="text-xs"
                    />
                  )}
                </div>
                <button
                  onClick={() => removeCondition(condition.id)}
                  className="text-slate-400 hover:text-red-500 mt-2 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addCondition}>
        <Plus size={12} className="mr-1.5" /> Add condition
      </Button>
    </div>
  )
}
```

**Step 3: `SetTransformConfig.tsx`**
```tsx
// src/components/workflow/configs/SetTransformConfig.tsx
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExpressionField } from "../ExpressionField"
import type { SetTransformConfig as Config } from "@/types"
import type { WorkflowNode } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
}

export function SetTransformConfig({ config, onChange, nodes, nodeOrder, currentNodeId }: Props) {
  function addField() {
    onChange({
      ...config,
      fields: [...config.fields, { id: `f-${Date.now()}`, name: "", value: "" }],
    })
  }

  function removeField(id: string) {
    onChange({ ...config, fields: config.fields.filter((f) => f.id !== id) })
  }

  function updateField(id: string, key: "name" | "value", val: string) {
    onChange({
      ...config,
      fields: config.fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)),
    })
  }

  const preview = config.fields.reduce<Record<string, string>>((acc, f) => {
    if (f.name) acc[f.name] = f.value
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {config.fields.map((field) => (
          <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={field.name}
                onChange={(e) => updateField(field.id, "name", e.target.value)}
                placeholder="Field name"
                className="text-xs font-mono"
              />
              <button
                onClick={() => removeField(field.id)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <ExpressionField
              label="Value"
              value={field.value}
              onChange={(val) => updateField(field.id, "value", val)}
              placeholder="Value or {{ expression }}"
              nodes={nodes}
              nodeOrder={nodeOrder}
              currentNodeId={currentNodeId}
            />
          </div>
        ))}
        {config.fields.length === 0 && (
          <p className="text-xs text-slate-400 py-2">No fields added yet</p>
        )}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addField}>
        <Plus size={12} className="mr-1.5" /> Add field
      </Button>

      {/* Output preview */}
      {Object.keys(preview).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Output preview</p>
          <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto max-h-32">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
```

**Step 4: `CodeConfig.tsx`**
```tsx
// src/components/workflow/configs/CodeConfig.tsx
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { oneDark } from "@codemirror/theme-one-dark"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { CodeConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function CodeConfig({ config, onChange }: Props) {
  function addMapping() {
    onChange({
      ...config,
      inputMappings: [...config.inputMappings, { name: "", expression: "" }],
    })
  }

  function removeMapping(idx: number) {
    onChange({
      ...config,
      inputMappings: config.inputMappings.filter((_, i) => i !== idx),
    })
  }

  function updateMapping(idx: number, key: "name" | "expression", val: string) {
    onChange({
      ...config,
      inputMappings: config.inputMappings.map((m, i) => (i === idx ? { ...m, [key]: val } : m)),
    })
  }

  return (
    <div className="space-y-4">
      {/* Context hint */}
      <div className="p-3 bg-slate-900 rounded-lg">
        <p className="text-xs font-semibold text-slate-400 mb-1.5">Available variables</p>
        {[
          { name: "$input",  desc: "Input data from previous step" },
          { name: "$steps",  desc: "All previous step outputs" },
          { name: "$item",   desc: "Current loop item (in loops)" },
          { name: "$index",  desc: "Current loop index (in loops)" },
        ].map(({ name, desc }) => (
          <div key={name} className="flex items-center gap-2 py-0.5">
            <span className="text-xs font-mono text-blue-400 w-20">{name}</span>
            <span className="text-xs text-slate-500">{desc}</span>
          </div>
        ))}
      </div>

      {/* Input mappings */}
      {config.inputMappings.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-600">Input mappings</Label>
          {config.inputMappings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={m.name}
                onChange={(e) => updateMapping(idx, "name", e.target.value)}
                placeholder="Variable name"
                className="text-xs font-mono w-32"
              />
              <Input
                value={m.expression}
                onChange={(e) => updateMapping(idx, "expression", e.target.value)}
                placeholder="{{ $steps[1].json.field }}"
                className="text-xs font-mono flex-1"
              />
              <button onClick={() => removeMapping(idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="text-xs" onClick={addMapping}>
        <Plus size={12} className="mr-1.5" /> Add input mapping
      </Button>

      {/* Code editor */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">JavaScript code</Label>
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <CodeMirror
            value={config.code}
            height="220px"
            theme={oneDark}
            extensions={[javascript()]}
            onChange={(code) => onChange({ ...config, code })}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              autocompletion: true,
            }}
          />
        </div>
        <p className="text-xs text-slate-400">
          Return a value from your code. It becomes this step's output data.
        </p>
      </div>
    </div>
  )
}
```

---

### Task 7: Build Node Config Forms — Flow Control Nodes

**Files:**
- Create: `src/components/workflow/configs/LoopConfig.tsx`
- Create: `src/components/workflow/configs/WaitConfig.tsx`
- Create: `src/components/workflow/configs/MergeConfig.tsx`

**Step 1: `LoopConfig.tsx`**
```tsx
// src/components/workflow/configs/LoopConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ExpressionField } from "../ExpressionField"
import type { LoopConfig as Config } from "@/types"
import type { WorkflowNode } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  nodeOrder: string[]
  currentNodeId: string
}

export function LoopConfig({ config, onChange, nodes, nodeOrder, currentNodeId }: Props) {
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Loop mode</Label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["forEach", "count"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ ...config, mode })}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                config.mode === mode
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {mode === "forEach" ? "For each item" : "Repeat N times"}
            </button>
          ))}
        </div>
      </div>

      {config.mode === "forEach" ? (
        <ExpressionField
          label="Array source"
          value={config.source ?? ""}
          onChange={(source) => onChange({ ...config, source })}
          placeholder="{{ $steps[1].json.rows }}"
          nodes={nodes}
          nodeOrder={nodeOrder}
          currentNodeId={currentNodeId}
        />
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Repeat count</Label>
          <Input
            value={config.count ?? ""}
            onChange={(e) => onChange({ ...config, count: e.target.value })}
            placeholder="5 or {{ $steps[1].json.pageCount }}"
            className="text-sm font-mono"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Batch size</Label>
        <Input
          type="number"
          value={config.batchSize}
          onChange={(e) => onChange({ ...config, batchSize: Math.min(10, Math.max(1, Number(e.target.value))) })}
          min={1}
          max={10}
          className="text-sm"
        />
        <p className="text-xs text-slate-400">
          Number of items to process in parallel per batch (1–10). Default: 1 (sequential).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">On item error</Label>
        <Select
          value={config.onItemError}
          onValueChange={(v) => onChange({ ...config, onItemError: v as Config["onItemError"] })}
        >
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stopAll">Stop entire workflow</SelectItem>
            <SelectItem value="skipItem">Skip failed item and continue</SelectItem>
            <SelectItem value="stopLoop">Stop loop, continue workflow</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

**Step 2: `WaitConfig.tsx`**
```tsx
// src/components/workflow/configs/WaitConfig.tsx
import { Copy } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { WaitConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function WaitConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Wait mode</Label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["duration", "webhookResume"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ ...config, mode })}
              className={cn(
                "flex-1 py-2 text-xs font-medium transition-colors",
                config.mode === mode
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {mode === "duration" ? "Fixed duration" : "Webhook resume"}
            </button>
          ))}
        </div>
      </div>

      {config.mode === "duration" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Wait for</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={config.durationValue ?? 5}
              onChange={(e) => onChange({ ...config, durationValue: Number(e.target.value) })}
              min={1}
              className="text-sm w-24"
            />
            <Select
              value={config.durationUnit ?? "minutes"}
              onValueChange={(v) => onChange({ ...config, durationUnit: v as Config["durationUnit"] })}
            >
              <SelectTrigger className="text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {config.mode === "webhookResume" && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">Coming soon (P1 feature)</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Webhook resume pauses the execution until an external HTTP call resumes it.
              This feature is planned for a future release.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Resume webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value="https://app.flowforge.dev/webhook/resume/..."
                readOnly
                className="font-mono text-xs bg-slate-50 text-slate-400"
              />
              <Copy size={14} className="text-slate-300 flex-shrink-0" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Max wait time (hours)</Label>
        <Input
          type="number"
          value={config.maxWaitHours ?? 24}
          onChange={(e) => onChange({ ...config, maxWaitHours: Number(e.target.value) })}
          min={1}
          max={24}
          className="text-sm"
        />
        <p className="text-xs text-slate-400">Maximum 24 hours. Executions waiting longer are auto-cancelled.</p>
      </div>
    </div>
  )
}
```

**Step 3: `MergeConfig.tsx`**
```tsx
// src/components/workflow/configs/MergeConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { MergeConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function MergeConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Merge strategy</Label>
        <Select
          value={config.strategy}
          onValueChange={(v) => onChange({ ...config, strategy: v as Config["strategy"] })}
        >
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="append">Append outputs (combine into array)</SelectItem>
            <SelectItem value="choose_branch">Choose executing branch only</SelectItem>
            <SelectItem value="combine_by_key">Combine by key field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.strategy === "append" && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            Combines all branch outputs into a single array. Skipped branches produce empty entries.
          </p>
        </div>
      )}

      {config.strategy === "choose_branch" && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            Passes through only the output of the branch that actually executed. Useful after IF nodes where only one branch runs.
          </p>
        </div>
      )}

      {config.strategy === "combine_by_key" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Key field</Label>
          <Input
            value={config.keyField ?? ""}
            onChange={(e) => onChange({ ...config, keyField: e.target.value })}
            placeholder="id"
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-400">
            Merges objects from each branch by matching on this field name.
          </p>
        </div>
      )}
    </div>
  )
}
```

---

### Task 8: Build Integration Placeholder Config

**Files:**
- Create: `src/components/workflow/configs/IntegrationPlaceholderConfig.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/configs/IntegrationPlaceholderConfig.tsx
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Link } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { useCredentials } from "@/hooks/useCredentials"
import type { NodeTypeMeta } from "../nodeTypes"
import type { IntegrationConfig } from "@/types"

interface Props {
  meta: NodeTypeMeta
  config: IntegrationConfig
  onChange: (config: IntegrationConfig) => void
}

export function IntegrationPlaceholderConfig({ meta, config, onChange }: Props) {
  const { data: credentials = [] } = useCredentials()
  const compatibleType = meta.type.includes("telegram") ? "telegram" : "google"
  const compatibleCreds = credentials.filter((c) => c.type === compatibleType)

  return (
    <div className="space-y-4">
      {/* Credential selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Credential</Label>
        <Select
          value={config.credentialId ?? ""}
          onValueChange={(v) => onChange({ ...config, credentialId: v })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a credential..." />
          </SelectTrigger>
          <SelectContent>
            {compatibleCreds.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.status === "expired" && " (expired)"}
              </SelectItem>
            ))}
            {compatibleCreds.length === 0 && (
              <SelectItem value="none" disabled>No credentials found</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Link
          to="/credentials"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink size={11} /> Manage credentials
        </Link>
      </div>

      {/* Placeholder body */}
      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <div className="text-2xl mb-2">{meta.icon}</div>
        <p className="text-sm font-semibold text-slate-700 mb-1">{meta.label}</p>
        <p className="text-xs text-slate-400">{meta.description}</p>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            Full configuration coming in the next release
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 9: Build Error Handling Tab

**Files:**
- Create: `src/components/workflow/configs/ErrorHandlingConfig.tsx`

**Step 1: Write the component**
```tsx
// src/components/workflow/configs/ErrorHandlingConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ErrorHandlingSettings {
  mode: "stop" | "continue" | "retry"
  retryCount?: number
  retryDelayMs?: number
}

interface Props {
  settings: ErrorHandlingSettings
  onChange: (settings: ErrorHandlingSettings) => void
}

const MODES = [
  { value: "stop",    label: "Stop workflow",  desc: "Halt execution on error (default)" },
  { value: "continue",label: "Continue",        desc: "Log error, continue to next step" },
  { value: "retry",   label: "Retry",           desc: "Re-attempt this step N times" },
]

export function ErrorHandlingConfig({ settings, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600">On error</Label>
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onChange({ ...settings, mode: m.value as ErrorHandlingSettings["mode"] })}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
              settings.mode === m.value
                ? "border-primary bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0",
              settings.mode === m.value ? "border-primary bg-primary" : "border-slate-300"
            )} />
            <div>
              <p className="text-sm font-medium text-slate-800">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {settings.mode === "retry" && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Max retries</Label>
            <Input
              type="number"
              value={settings.retryCount ?? 3}
              onChange={(e) => onChange({ ...settings, retryCount: Number(e.target.value) })}
              min={1}
              max={10}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Retry delay (ms)</Label>
            <Input
              type="number"
              value={settings.retryDelayMs ?? 1000}
              onChange={(e) => onChange({ ...settings, retryDelayMs: Number(e.target.value) })}
              min={100}
              max={60000}
              step={100}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Task 10: Build NodeConfigPanel Shell

**Files:**
- Create: `src/components/workflow/NodeConfigPanel.tsx`

**Step 1: Write the panel**
```tsx
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
import type { WorkflowNode } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
  node: WorkflowNode
  nodes: WorkflowNode[]
  nodeOrder: string[]
}

export function NodeConfigPanel({ open, onClose, node, nodes, nodeOrder }: Props) {
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

  const fieldProps = { nodes, nodeOrder, currentNodeId: node.id }

  function renderSettingsForm() {
    const config = node.config as Record<string, unknown>
    const update = (c: unknown) => updateNodeConfig(node.id, c as WorkflowNode["config"])

    switch (node.type) {
      case "manual_trigger":
        return <ManualTriggerConfig config={config as import("@/types").ManualTriggerConfig} onChange={update} />
      case "webhook_trigger":
        return <WebhookTriggerConfig config={config as import("@/types").WebhookTriggerConfig} onChange={update} />
      case "schedule_trigger":
        return <ScheduleTriggerConfig config={config as import("@/types").ScheduleTriggerConfig} onChange={update} />
      case "http_request":
        return <HttpRequestConfig config={config as import("@/types").HttpRequestConfig} onChange={update} {...fieldProps} />
      case "if_condition":
        return <IfConditionConfig config={config as import("@/types").IfConditionConfig} onChange={update} {...fieldProps} />
      case "set_transform":
        return <SetTransformConfig config={config as import("@/types").SetTransformConfig} onChange={update} {...fieldProps} />
      case "code":
        return <CodeConfig config={config as import("@/types").CodeConfig} onChange={update} />
      case "loop":
        return <LoopConfig config={config as import("@/types").LoopConfig} onChange={update} {...fieldProps} />
      case "wait":
        return <WaitConfig config={config as import("@/types").WaitConfig} onChange={update} />
      case "merge":
        return <MergeConfig config={config as import("@/types").MergeConfig} onChange={update} />
      default:
        return (
          <IntegrationPlaceholderConfig
            meta={meta}
            config={config as import("@/types").IntegrationConfig}
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
                  <ErrorHandlingConfig settings={errorSettings} onChange={setErrorSettings} />
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
```

---

### Task 11: Wire Config Panel Into Editor Page

**Files:**
- Modify: `src/app/routes/workflow-editor.tsx`

**Step 1: Replace the stub panel with the real one**

Import the panel:
```tsx
import { NodeConfigPanel } from "@/components/workflow/NodeConfigPanel"
```

Replace the stub `{isPanelOpen && (...)}` section with:
```tsx
{isPanelOpen && selectedNodeId && (() => {
  const selectedNode = editorWorkflow.nodes.find((n) => n.id === selectedNodeId)
  return selectedNode ? (
    <NodeConfigPanel
      open={isPanelOpen}
      onClose={closePanel}
      node={selectedNode}
      nodes={editorWorkflow.nodes}
      nodeOrder={editorWorkflow.nodeOrder}
    />
  ) : null
})()}
```

---

### Task 12: Manual Verification

**Step 1: Start dev server**
```bash
npm run dev
```

**Step 2: Verify each node type config**

For each node type, add it to a workflow and click it to open the config panel. Verify:

- **Manual Trigger** → JSON textarea, "Use this sample" button
- **Webhook Trigger** → Read-only URL with copy button, method select, response mode select
- **Schedule Trigger** → Preset dropdown with human-readable preview, custom cron field, timezone select
- **HTTP Request** → URL field + variable picker, method, Body/Headers/Params/Auth tabs, each auth type shows correct sub-fields
- **IF Condition** → AND/OR toggle, condition rows with field/operation/value, add/remove rows, value hidden for is_empty/is_not_empty
- **Set Transform** → Field rows with name+value+variable picker, output preview JSON
- **Code** → Context variables panel, input mappings, CodeMirror editor with syntax highlighting
- **Loop** → Mode toggle (forEach/count), expression or number input, batch size, error mode select
- **Wait** → Mode toggle, duration value+unit or webhook resume placeholder
- **Merge** → Strategy select, key field shown only for combine_by_key
- **Telegram/Google Sheets** → Credential dropdown + "coming soon" placeholder

Verify cross-cutting:
- "Test this step" button → 800ms delay → node card border turns green → toast success
- Error tab → all 3 modes selectable, retry shows sub-fields
- Variable picker popup → shows groups from previous steps

---

### Task 13: Run Tests & Commit

**Step 1: Run tests**
```bash
npm run test:run
```

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: complete node config panel for all node types"
```
