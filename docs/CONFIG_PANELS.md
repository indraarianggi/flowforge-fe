# FlowForge — Config Panel Reference

> A comprehensive overview of every node's configuration panel: what fields are exposed, what data model backs them, and which shared components are used.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Main Panel Shell — `NodeConfigPanel`](#2-main-panel-shell--nodeconfigpanel)
3. [Trigger Nodes](#3-trigger-nodes)
   - [Manual Trigger](#31-manual-trigger)
   - [Webhook Trigger](#32-webhook-trigger)
   - [Schedule Trigger](#33-schedule-trigger)
4. [Action Nodes](#4-action-nodes)
   - [HTTP Request](#41-http-request)
   - [Set / Transform](#42-set--transform)
   - [Code](#43-code)
5. [Flow Control Nodes](#5-flow-control-nodes)
   - [IF Condition](#51-if-condition)
   - [Loop](#52-loop)
   - [Wait](#53-wait)
   - [Merge](#54-merge)
6. [Integration Nodes (Placeholder)](#6-integration-nodes-placeholder)
7. [Shared / Cross-cutting Config](#7-shared--cross-cutting-config)
   - [Error Handling Tab](#71-error-handling-tab)
8. [Shared UI Components](#8-shared-ui-components)
9. [State Management](#9-state-management)
10. [Node Type Registry](#10-node-type-registry)
11. [Quick Reference Table](#11-quick-reference-table)

---

## 1. Architecture Overview

```
NodeConfigPanel.tsx          ← Sheet (right-side drawer) + tab shell
│
├── Settings tab
│   └── switch(node.type) → renders one of the *Config components below
│
├── Input tab               ← placeholder (shows upstream step output)
├── Output tab              ← placeholder (populated after "Test this step")
└── Error tab
    └── ErrorHandlingConfig ← shared across ALL node types
```

Every config component receives:
```typescript
props: {
  config: NodeConfig          // current node config slice
  onChange: (patch) => void   // calls editorStore.updateNodeConfig(nodeId, patch)
  nodes: WorkflowNode[]       // for VariablePicker / ExpressionField
  edges: WorkflowEdge[]
  currentNodeId: string
}
```

Config is persisted in the Zustand `editorStore` and written back to the `WorkflowNode.config` field.

---

## 2. Main Panel Shell — `NodeConfigPanel`

**File**: `src/components/workflow/NodeConfigPanel.tsx`

| Concern | Detail |
|---------|--------|
| Trigger | User clicks a node on the canvas → `selectNode(id)` |
| Container | Shadcn `<Sheet>` anchored to the right |
| Header | Node icon (emoji) · label · close button |
| Tabs | Settings · Input · Output · Error |
| Footer | "Test this step" button (loading state while running) |
| Routing | `switch (node.type)` dispatches to the specific `*Config` component |

---

## 3. Trigger Nodes

### 3.1 Manual Trigger

**File**: `src/components/workflow/configs/ManualTriggerConfig.tsx`
**Node type**: `manual_trigger`

#### Data Model
```typescript
interface ManualTriggerConfig {
  sampleData?: string   // valid JSON string
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Sample input data (JSON) | `<Textarea>` | Optional; shows "Invalid JSON" inline error on bad input |
| Use this sample for variable picker | `<Button>` | Only visible when JSON is valid; seeds VariablePicker preview values |

---

### 3.2 Webhook Trigger

**File**: `src/components/workflow/configs/WebhookTriggerConfig.tsx`
**Node type**: `webhook_trigger`

#### Data Model
```typescript
interface WebhookTriggerConfig {
  path: string
  method: "GET" | "POST" | "ANY"
  responseMode: "immediately" | "after_workflow"
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Webhook URL | Read-only `<Input>` | `https://app.flowforge.dev/webhook/{path}` + copy button |
| HTTP method | `<Select>` | POST · GET · Any method |
| Response mode | `<Select>` | "Respond immediately (202 Accepted)" · "Respond after workflow completes" |

---

### 3.3 Schedule Trigger

**File**: `src/components/workflow/configs/ScheduleTriggerConfig.tsx`
**Node type**: `schedule_trigger`

#### Data Model
```typescript
interface ScheduleTriggerConfig {
  preset: "every_5m" | "hourly" | "daily" | "weekly" | "monthly" | "custom"
  cron?: string       // only when preset = "custom"
  timezone: string
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Schedule | `<Select>` | 5 named presets + "Custom cron expression" |
| Cron expression | `<Input>` (monospace) | Conditionally shown when preset = `custom` |
| Human-readable description | Info box | Auto-computed from cron string for non-custom presets |
| Timezone | `<Select>` | 13 options — UTC, Americas, Europe, Asia, Australia |

---

## 4. Action Nodes

### 4.1 HTTP Request

**File**: `src/components/workflow/configs/HttpRequestConfig.tsx`
**Node type**: `http_request`

#### Data Model
```typescript
interface HttpRequestConfig {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers: Array<{ key: string; value: string }>
  queryParams: Array<{ key: string; value: string }>
  bodyType: "json" | "form" | "raw"
  body?: string
  authType: "none" | "bearer" | "basic" | "api_key"
  authConfig?: Record<string, string>
  timeout: number   // milliseconds
}
```

#### Fields — split across internal tabs

**General (always visible)**

| Field | Type | Notes |
|-------|------|-------|
| URL | `<ExpressionField>` | Supports `{{ }}` expressions |
| Method | `<Select>` | GET · POST · PUT · DELETE · PATCH |

**Body tab**

| Field | Type | Notes |
|-------|------|-------|
| Body type | `<Select>` | JSON · Form data · Raw |
| Body | `<Textarea>` | Hidden for GET; visible for all other methods |

**Headers tab**

| Field | Type | Notes |
|-------|------|-------|
| Headers | `<KeyValueEditor>` | Dynamic key-value rows; Add / Delete row |

**Params tab**

| Field | Type | Notes |
|-------|------|-------|
| Query params | `<KeyValueEditor>` | Dynamic key-value rows |

**Auth tab**

| Field | Type | Notes |
|-------|------|-------|
| Authentication | `<Select>` | None · Bearer token · Basic · API key |
| Bearer → Token | `<Input type="password">` | |
| Basic → Username | `<Input>` | |
| Basic → Password | `<Input type="password">` | |
| API key → Key name | `<Input>` | e.g., `X-API-Key` |
| API key → Key value | `<Input type="password">` | |
| API key → Send in | `<Select>` | Header · Query parameter |

**Footer**

| Field | Type | Notes |
|-------|------|-------|
| Timeout (ms) | `<Input type="number">` | Range: 100–60 000 |

---

### 4.2 Set / Transform

**File**: `src/components/workflow/configs/SetTransformConfig.tsx`
**Node type**: `set_transform`

#### Data Model
```typescript
interface SetTransformConfig {
  fields: Array<{ id: string; name: string; value: string }>
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Field name | `<Input>` (monospace) | Per-row label |
| Value | `<ExpressionField>` | Supports `{{ }}` expressions + VariablePicker |
| Delete row | Icon button (Trash2) | |
| Add field | `<Button>` | Appends a new row |
| Output preview | JSON code block | Shown when at least one field exists; live preview of combined output |

---

### 4.3 Code

**File**: `src/components/workflow/configs/CodeConfig.tsx`
**Node type**: `code`

#### Data Model
```typescript
interface CodeConfig {
  code: string
  inputMappings: Array<{ name: string; expression: string }>
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Available variables info box | Read-only block | Shows `$input`, `$steps`, `$item`, `$index` |
| Input mappings (per row) | Variable name `<Input>` + expression `<Input>` | Map upstream expressions to local JS variable names |
| Add input mapping | `<Button>` | |
| JavaScript code | `<CodeMirror>` | JS syntax highlight · One Dark theme · line numbers · autocomplete · 220 px height |

---

## 5. Flow Control Nodes

### 5.1 IF Condition

**File**: `src/components/workflow/configs/IfConditionConfig.tsx`
**Node type**: `if_condition`

#### Data Model
```typescript
interface IfConditionConfig {
  combinator: "AND" | "OR"
  conditions: ConditionRow[]
}

interface ConditionRow {
  id: string
  field: string
  operation:
    | "equals" | "not_equals" | "contains"
    | "greater_than" | "less_than"
    | "is_empty" | "is_not_empty" | "regex"
  value: string   // hidden for is_empty / is_not_empty
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Match | Toggle buttons | AND · OR |
| Field | `<Input>` (monospace) | e.g., `{{ $steps[1].json.status }}` |
| Operation | `<Select>` | 8 options (see above) |
| Value | `<Input>` | Hidden when operation is `is_empty` / `is_not_empty` |
| Delete condition | Icon button (Trash2) | |
| Add condition | `<Button>` | |

---

### 5.2 Loop

**File**: `src/components/workflow/configs/LoopConfig.tsx`
**Node type**: `loop`

#### Data Model
```typescript
interface LoopConfig {
  mode: "forEach" | "count"
  source?: string       // expression — used when mode = "forEach"
  count?: string        // number or expression — used when mode = "count"
  batchSize: number     // 1–10
  onItemError: "stopAll" | "skipItem" | "stopLoop"
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Loop mode | Toggle buttons | "For each item" · "Repeat N times" |
| Array source (forEach) | `<ExpressionField>` | e.g., `{{ $steps[1].json.rows }}` |
| Repeat count (count) | `<Input>` (monospace) | Number or expression |
| Batch size | `<Input type="number">` | 1–10; default 1 (sequential) |
| On item error | `<Select>` | Stop entire workflow · Skip failed item · Stop loop, continue workflow |

---

### 5.3 Wait

**File**: `src/components/workflow/configs/WaitConfig.tsx`
**Node type**: `wait`

#### Data Model
```typescript
interface WaitConfig {
  mode: "duration" | "webhookResume"
  durationValue?: number
  durationUnit?: "seconds" | "minutes" | "hours"
  maxWaitHours?: number   // 1–24
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Wait mode | Toggle buttons | "Fixed duration" · "Webhook resume" |
| Wait for (duration) | `<Input type="number">` + unit `<Select>` | Seconds · Minutes · Hours |
| Webhook resume | Info box (amber) | "Coming soon (P1 feature)" |
| Resume webhook URL | Read-only `<Input>` | Disabled; placeholder only |
| Max wait time (hours) | `<Input type="number">` | 1–24; executions beyond limit are auto-cancelled |

---

### 5.4 Merge

**File**: `src/components/workflow/configs/MergeConfig.tsx`
**Node type**: `merge`

#### Data Model
```typescript
interface MergeConfig {
  mode: "append" | "chooseBranch" | "combineByKey"
  keyField?: string    // only when mode = "combineByKey"
  waitForAll?: boolean // default: true — wait for all branches before merging
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Merge strategy | `<Select>` | Append outputs · Choose executing branch · Combine by key field |
| Key field | `<Input>` (monospace) | Only visible for `combineByKey`; e.g., `"id"` |
| Mode info box | Info box | Contextual help text per mode |
| Wait for all branches | `<Checkbox>` | Default: checked. Unchecked = first-wins (pass through whichever branch finishes first) |

---

## 6. Integration Nodes (Placeholder)

**File**: `src/components/workflow/configs/IntegrationPlaceholderConfig.tsx`
**Node types**: `telegram_trigger` · `telegram_send_message` · `google_sheets_append` · `google_sheets_read`

#### Data Model
```typescript
interface IntegrationConfig {
  credentialId?: string
  [key: string]: unknown
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| Credential | `<Select>` | Filtered by integration type (telegram/google); shows "(expired)" badge; links to `/credentials` |
| Placeholder body | Dashed-border box | Icon · label · description · "Full configuration coming in the next release" |

---

## 7. Shared / Cross-cutting Config

### 7.1 Error Handling Tab

**File**: `src/components/workflow/configs/ErrorHandlingConfig.tsx`
**Applies to**: **Every** node type (rendered in the "Error" tab of `NodeConfigPanel`)

#### Data Model
```typescript
interface ErrorHandlingSettings {
  mode: "stop" | "continue" | "retry"
  retryCount?: number       // 1–10
  retryDelayMs?: number     // 100–60 000 ms, step 100
}
```

#### Fields

| Field | Type | Notes |
|-------|------|-------|
| On error | Radio group | Stop workflow (default) · Continue · Retry |
| Max retries (retry mode) | `<Input type="number">` | 1–10 |
| Retry delay (ms) (retry mode) | `<Input type="number">` | 100–60 000, step 100 |

---

## 8. Shared UI Components

### `ExpressionField`
**File**: `src/components/workflow/ExpressionField.tsx`

Wraps a plain `<Input>` or `<Textarea>` (controlled by `multiline` prop) and appends a **VariablePicker** trigger button. Inserts selected variables at the current cursor position using `{{ $variable }}` syntax.

**Used by**: HttpRequest · SetTransform · IfCondition · LoopConfig

---

### `VariablePicker`
**File**: `src/components/workflow/VariablePicker.tsx`

Popover listing all available upstream variables. Groups them by step/source:

| Variable | Description |
|----------|-------------|
| `$trigger.json` | Trigger body / headers |
| `$steps[N].json` | Step N output (statusCode, body, json) |
| `$item` | Current loop item (only inside a loop) |
| `$index` | Current loop index (only inside a loop) |
| `$now` | Current ISO timestamp |

Uses BFS backward-traversal through edges to find ancestor nodes.

---

### `KeyValueEditor`
**File**: `src/components/workflow/KeyValueEditor.tsx`

Reusable dynamic key-value pair manager. Each row has a key input + value input + delete button. Supports an "empty state" message.

**Used by**: HttpRequest (headers, query params)

---

### `CodeMirror` (external)
Used exclusively in `CodeConfig`. Configured with:
- `@codemirror/lang-javascript`
- `@uiw/codemirror-theme-one-dark`
- Extensions: line numbers, active-line highlight, autocompletion

---

## 9. State Management

**File**: `src/stores/editorStore.ts`

Zustand store that owns all editor state. Config panel relevant actions:

| Action | Signature | Description |
|--------|-----------|-------------|
| `selectNode` | `(id: string) => void` | Opens the panel for the given node |
| `closePanel` | `() => void` | Closes the config sheet |
| `updateNodeConfig` | `(id, patch) => void` | Merges a partial config update |
| `updateNodeStatus` | `(id, status) => void` | Sets node status badge (`unconfigured` · `configured` · `tested` · `error`) |

Relevant state slices:

```typescript
selectedNodeId: string | null
isPanelOpen: boolean
workflow: Workflow   // contains nodes[].config
```

---

## 10. Node Type Registry

**File**: `src/components/workflow/nodeTypes.ts`

Central metadata registry for all 14 node types:

| Type | Label | Icon | Color | Category |
|------|-------|------|-------|----------|
| `manual_trigger` | Manual Trigger | ▶ | purple | trigger |
| `webhook_trigger` | Webhook Trigger | 🌐 | purple | trigger |
| `schedule_trigger` | Schedule Trigger | 🕐 | purple | trigger |
| `telegram_trigger` | Telegram Trigger | ✈ | sky | integration |
| `http_request` | HTTP Request | ⚡ | blue | action |
| `set_transform` | Set / Transform | ✏ | blue | action |
| `code` | Code | {} | blue | action |
| `if_condition` | IF Condition | ⑂ | amber | flow_control |
| `loop` | Loop | ↻ | blue | flow_control |
| `wait` | Wait | ⏸ | blue | flow_control |
| `merge` | Merge | ⑁ | blue | flow_control |
| `telegram_send_message` | Send Message | ✈ | sky | integration |
| `google_sheets_append` | Append Row | 📊 | green | integration |
| `google_sheets_read` | Read Sheet | 📊 | green | integration |

Also exports `defaultConfig: Record<NodeType, object>` — the initial config values applied when a node is first placed on the canvas.

---

## 11. Quick Reference Table

| Node Type | Config File | Expression Fields | Has Tabs | Status |
|-----------|-------------|-------------------|----------|--------|
| `manual_trigger` | ManualTriggerConfig | — | No | ✅ Implemented |
| `webhook_trigger` | WebhookTriggerConfig | — | No | ✅ Implemented |
| `schedule_trigger` | ScheduleTriggerConfig | — | No | ✅ Implemented |
| `http_request` | HttpRequestConfig | URL | Yes (Body/Headers/Params/Auth) | ✅ Implemented |
| `set_transform` | SetTransformConfig | Value (per row) | No | ✅ Implemented |
| `code` | CodeConfig | Input mappings | No | ✅ Implemented |
| `if_condition` | IfConditionConfig | Field (per row) | No | ✅ Implemented |
| `loop` | LoopConfig | Array source / Count | No | ✅ Implemented |
| `wait` | WaitConfig | — | No | ✅ Implemented |
| `merge` | MergeConfig | — | No | ✅ Implemented |
| `telegram_trigger` | IntegrationPlaceholder | — | No | 🚧 Placeholder |
| `telegram_send_message` | IntegrationPlaceholder | — | No | 🚧 Placeholder |
| `google_sheets_append` | IntegrationPlaceholder | — | No | 🚧 Placeholder |
| `google_sheets_read` | IntegrationPlaceholder | — | No | 🚧 Placeholder |
| *(all nodes)* | ErrorHandlingConfig | — | Error tab | ✅ Implemented |
