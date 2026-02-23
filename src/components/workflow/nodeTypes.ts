// src/components/workflow/nodeTypes.ts
import type { NodeType, NodeCategory } from "@/types"

export interface NodeTypeMeta {
  type: NodeType
  label: string
  description: string
  category: NodeCategory
  icon: string // emoji or identifier
  color: string // Tailwind bg class
}

export const NODE_TYPE_META: NodeTypeMeta[] = [
  // Triggers
  { type: "manual_trigger",   label: "Manual Trigger",     description: "Start this workflow manually",                     category: "trigger",      icon: "▶", color: "bg-purple-100 text-purple-700" },
  { type: "webhook_trigger",  label: "Webhook",            description: "Trigger on incoming HTTP request",                 category: "trigger",      icon: "🌐", color: "bg-purple-100 text-purple-700" },
  { type: "schedule_trigger", label: "Schedule / Cron",    description: "Run on a time-based schedule",                     category: "trigger",      icon: "🕐", color: "bg-purple-100 text-purple-700" },
  { type: "telegram_trigger", label: "Telegram — Message", description: "Trigger when your Telegram bot gets a message",    category: "integration",  icon: "✈", color: "bg-sky-100 text-sky-700" },

  // Actions
  { type: "http_request",     label: "HTTP Request",       description: "Make a request to any API endpoint",               category: "action",       icon: "⚡", color: "bg-blue-100 text-blue-700" },
  { type: "set_transform",    label: "Set / Transform",    description: "Create or transform data fields",                   category: "action",       icon: "✏", color: "bg-blue-100 text-blue-700" },
  { type: "code",             label: "Code",               description: "Run custom JavaScript in a sandbox",               category: "action",       icon: "{}",color: "bg-blue-100 text-blue-700" },

  // Flow Control
  { type: "if_condition",     label: "IF / Condition",     description: "Branch the flow based on conditions",              category: "flow_control", icon: "⑂", color: "bg-amber-100 text-amber-700" },
  { type: "loop",             label: "Loop",               description: "Iterate over a list or repeat N times",            category: "flow_control", icon: "↻", color: "bg-blue-100 text-blue-700" },
  { type: "wait",             label: "Wait",               description: "Pause execution for a duration",                   category: "flow_control", icon: "⏸", color: "bg-blue-100 text-blue-700" },
  { type: "merge",            label: "Merge",              description: "Combine outputs from parallel branches",           category: "flow_control", icon: "⑁", color: "bg-blue-100 text-blue-700" },

  // Integrations
  { type: "telegram_send_message", label: "Telegram — Send Message", description: "Send a message via your Telegram bot",  category: "integration",  icon: "✈", color: "bg-sky-100 text-sky-700" },
  { type: "google_sheets_append",  label: "Google Sheets — Append",  description: "Append a row to a Google Sheet",        category: "integration",  icon: "📊", color: "bg-green-100 text-green-700" },
  { type: "google_sheets_read",    label: "Google Sheets — Read",    description: "Read rows from a Google Sheet",         category: "integration",  icon: "📊", color: "bg-green-100 text-green-700" },
]

export function getNodeMeta(type: NodeType): NodeTypeMeta {
  return NODE_TYPE_META.find((m) => m.type === type) ?? NODE_TYPE_META[0]
}

export const defaultConfig: Record<NodeType, object> = {
  manual_trigger:        { sampleData: "" },
  webhook_trigger:       { path: `wh-${Math.random().toString(36).slice(2,10)}`, method: "POST", responseMode: "immediately" },
  schedule_trigger:      { preset: "daily", timezone: "UTC" },
  telegram_trigger:      { credentialId: "" },
  http_request:          { url: "", method: "GET", headers: [], queryParams: [], bodyType: "json", authType: "none", timeout: 5000 },
  if_condition:          { combinator: "AND", conditions: [{ id: `c-${Date.now()}`, field: "", operation: "equals", value: "" }] },
  set_transform:         { fields: [{ id: `f-${Date.now()}`, name: "", value: "" }] },
  code:                  { code: "// Return the output data\nreturn $input", inputMappings: [] },
  loop:                  { mode: "forEach", source: "", batchSize: 1, onItemError: "stopAll" },
  wait:                  { mode: "duration", durationValue: 5, durationUnit: "minutes" },
  merge:                 { mode: "append", waitForAll: true },
  telegram_send_message: { credentialId: "" },
  google_sheets_append:  { credentialId: "" },
  google_sheets_read:    { credentialId: "" },
}
