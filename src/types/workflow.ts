// src/types/workflow.ts

export type NodeType =
  | "manual_trigger"
  | "webhook_trigger"
  | "schedule_trigger"
  | "telegram_trigger"
  | "http_request"
  | "if_condition"
  | "set_transform"
  | "code"
  | "loop"
  | "wait"
  | "merge"
  | "telegram_send_message"
  | "google_sheets_append"
  | "google_sheets_read"

export type NodeCategory = "trigger" | "action" | "flow_control" | "integration"

// Config shapes per node type
export interface ManualTriggerConfig {
  sampleData?: string // JSON string
}

export interface WebhookTriggerConfig {
  path: string
  method: "GET" | "POST" | "ANY"
  responseMode: "immediately" | "after_workflow"
}

export interface ScheduleTriggerConfig {
  preset: "every_5m" | "hourly" | "daily" | "weekly" | "monthly" | "custom"
  cron?: string
  timezone: string
}

export interface HttpRequestConfig {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers: Array<{ key: string; value: string }>
  queryParams: Array<{ key: string; value: string }>
  bodyType: "json" | "form" | "raw"
  body?: string
  authType: "none" | "bearer" | "basic" | "api_key"
  authConfig?: Record<string, string>
  timeout: number
}

export interface ConditionRow {
  id: string
  field: string
  operation:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty"
    | "regex"
  value: string
}

export interface IfConditionConfig {
  combinator: "AND" | "OR"
  conditions: ConditionRow[]
}

export interface SetTransformConfig {
  fields: Array<{ id: string; name: string; value: string }>
}

export interface CodeConfig {
  code: string
  inputMappings: Array<{ name: string; expression: string }>
}

export interface LoopConfig {
  mode: "forEach" | "count"
  source?: string // expression for forEach
  count?: string // number or expression for count
  batchSize: number
  onItemError: "stopAll" | "skipItem" | "stopLoop"
}

export interface WaitConfig {
  mode: "duration" | "webhookResume"
  durationValue?: number
  durationUnit?: "seconds" | "minutes" | "hours"
  maxWaitHours?: number
}

export interface MergeConfig {
  strategy: "append" | "choose_branch" | "combine_by_key"
  keyField?: string
}

export interface IntegrationConfig {
  credentialId?: string
  [key: string]: unknown
}

export type NodeConfig =
  | ManualTriggerConfig
  | WebhookTriggerConfig
  | ScheduleTriggerConfig
  | HttpRequestConfig
  | IfConditionConfig
  | SetTransformConfig
  | CodeConfig
  | LoopConfig
  | WaitConfig
  | MergeConfig
  | IntegrationConfig

export type NodeStatus = "unconfigured" | "configured" | "tested" | "error"

export interface WorkflowNode {
  id: string
  type: NodeType
  label: string
  category: NodeCategory
  status: NodeStatus
  config: NodeConfig
  position: { x: number; y: number }
  credentialId?: string           // top-level for quick execution engine access (not buried inside config)
  onError?: 'stop' | 'continue' | 'retry' | 'skipItem'  // default: 'stop'. 'skipItem' only valid inside Loop
  retryCount?: number             // only when onError = 'retry'. Default: 3
  retryDelayMs?: number           // delay between retries in ms. Default: 1000
  disabled?: boolean              // if true, skip during execution. Default: false
  parentId?: string               // for nodes inside branches/loops
  branchType?: 'true' | 'false' | 'body'
}

export interface WorkflowEdge {
  id: string
  source: string          // source node ID
  target: string          // target node ID
  sourceHandle?: string   // 'main' | 'true' | 'false' | 'loopBody' | 'loopComplete'
  targetHandle?: string   // 'main' | 'branchA' | 'branchB'
  type?: string           // 'default' | 'branch' | 'loop'
  label?: string          // 'True' | 'False' | 'Loop'
}

export interface WorkflowSettings {
  timezone?: string           // IANA timezone. Default: 'UTC'
  maxExecutionTimeMs?: number // Max total execution time in ms. Default: 300000 (5 min)
  maxLoopIterations?: number  // Max iterations per Loop node. Default: 1000
  maxNestingDepth?: number    // Max branch/loop nesting depth. Default: 3
}

export type TriggerConfig =
  | { type: 'manual' }
  | { type: 'webhook'; webhookPath: string; method: string }
  | { type: 'schedule'; cronExpression: string; timezone: string }
  | { type: 'telegram'; credentialId: string; chatFilter: 'all' | string[] }

export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  isActive: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  settings: WorkflowSettings
  triggerConfig?: TriggerConfig  // read-only — derived by the backend on save, never sent by the frontend
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}
