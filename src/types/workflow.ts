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
  // For IF node branches
  trueBranchNodeIds?: string[]
  falseBranchNodeIds?: string[]
  // For Loop node body
  bodyNodeIds?: string[]
  // Position in flow
  parentId?: string // for nodes inside branches/loops
  branchType?: "true" | "false" | "body"
}

export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  isActive: boolean
  nodes: WorkflowNode[]
  // Ordered list of top-level node IDs
  nodeOrder: string[]
  settings: {
    timeout?: number
    errorMode?: "stop" | "continue"
  }
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}
