# Product Requirements Document (PRD)
# FlowForge — Workflow Automation Platform

**Version:** 1.2 MVP (React Flow Edition)
**Last Updated:** February 20, 2026
**Author:** Product Team

---

## 1. Executive Summary

FlowForge is a workflow automation platform that enables non-technical users to connect apps, automate repetitive tasks, and build multi-step workflows through an intuitive visual interface. The platform features a **free-form horizontal canvas powered by React Flow** where users build workflows by connecting nodes left-to-right. Nodes can be freely dragged and repositioned while auto-layout keeps the flow organized. The platform supports linear sequential workflows, branching/merging flows (IF true/false), loops, and wait nodes — no code required.

### 1.1 Vision

Empower anyone — regardless of technical skill — to automate their digital workflows in under 5 minutes.

### 1.2 MVP Scope

The MVP delivers a fully functional workflow automation tool with:

- A **free-form horizontal workflow editor** powered by React Flow with drag-and-drop node positioning, auto-layout, and modal-based node selection, supporting **parallel branches and merge points**
- Core execution engine with DAG resolution, **parallel branch execution**, error handling, and retry logic
- Built-in nodes: Manual Trigger, Webhook, Schedule/Cron, HTTP Request, IF/Condition, Set/Transform, Code, **Loop**, **Wait**, **Merge**
- **Parallel branch support**: IF node routes to true/false branches that execute independently and can be merged
- **Loop processing**: Iterate over arrays or repeat N times with per-item execution
- **Wait node**: Pause execution for a duration or until an external event
- **Merge node**: Combine outputs from parallel branches back into a single flow
- Integration nodes: **Telegram** (trigger + actions) and **Google Sheets** (actions)
- Credential management with AES-256-GCM encryption and OAuth2 support
- Real-time execution monitoring via WebSocket
- Execution history with debugging and error diagnostics

---

## 2. Target Users

### 2.1 Primary Persona — "The Non-Tech Operator"

- Small business owners, marketing managers, operations leads, freelancers
- Comfortable using web apps (Gmail, Sheets, Slack) but cannot write code
- Needs to automate repetitive tasks: logging data, sending notifications, syncing between apps
- Values simplicity, clarity, and instant feedback over flexibility

### 2.2 Secondary Persona — "The Technical Power User"

- Developers, data analysts, DevOps engineers
- Wants quick automation without building full backend services
- Will use Code nodes, HTTP Request, and Webhook triggers
- Values speed of setup, API access, and extensibility

---

## 3. User Stories

### 3.1 Workflow Management

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As a user, I can create a new workflow that starts with a Trigger placeholder and an Action placeholder so I have a clear starting point. | P0 |
| US-02 | As a user, I can click a placeholder card to open a modal where I search and select an app, then pick a specific event/action. | P0 |
| US-03 | As a user, I can add steps between existing nodes or at the end by clicking a "+" button. | P0 |
| US-04 | As a user, I can reorder steps by dragging nodes on the canvas and repositioning them. Auto-layout can re-organize the flow at any time. | P1 |
| US-05 | As a user, I can delete a step from the workflow and the remaining steps re-number automatically. | P0 |
| US-06 | As a user, I can rename my workflow by clicking the title in the top bar. | P0 |
| US-07 | As a user, I can duplicate an existing workflow to use it as a starting point for a new one. | P1 |
| US-08 | As a user, I can toggle a workflow between Active and Inactive. Active workflows listen for triggers; inactive ones do not. | P0 |
| US-09 | As a user, I can save my workflow at any time. The system also auto-saves on significant changes. | P0 |

### 3.2 Node Configuration

| ID | Story | Priority |
|----|-------|----------|
| US-10 | As a user, when I click a configured node card, a configuration panel slides open on the right showing all settings for that node. | P0 |
| US-11 | As a user, I can select a credential (e.g., "My Telegram Bot") from a dropdown in the config panel. If none exist, I can create one inline. | P0 |
| US-12 | As a user, I can map data from previous steps into the current step's fields by clicking "Insert Variable" which opens a picker showing all available fields with sample data. | P0 |
| US-13 | As a user, I can switch any text field to "Expression mode" to write dynamic expressions that reference previous step outputs. | P1 |
| US-14 | As a user, I can test a single step in isolation to verify it works before running the whole workflow. | P0 |

### 3.3 Branching & Flow Control

| ID | Story | Priority |
|----|-------|----------|
| US-30 | As a user, I can configure an IF node so that the true branch and false branch each continue as separate parallel paths visually below the IF node. | P0 |
| US-31 | As a user, I can add multiple steps to each branch of an IF node independently. | P0 |
| US-32 | As a user, I can add a Merge node to combine the outputs from two parallel branches back into a single flow. | P0 |
| US-33 | As a user, I can configure a Loop node that iterates over an array from a previous step, executing its child nodes once per item. | P0 |
| US-34 | As a user, I can configure a Loop node in "fixed count" mode that repeats its body N times. | P0 |
| US-35 | As a user, I can add a Wait node that pauses execution for a configurable duration (seconds, minutes, hours). | P0 |
| US-36 | As a user, I can add a Wait node that pauses execution until an incoming webhook event resumes it. | P1 |
| US-37 | As a user, I can see the parallel branches of an IF node displayed side by side (or stacked with clear labels) in the editor, with visual connectors to the Merge node. | P0 |
| US-38 | As a user, when viewing execution of a branching workflow, I can see which branch was taken and which was skipped. | P0 |
| US-39 | As a user, I can nest an IF node inside a branch of another IF node (up to 3 levels deep in MVP). | P1 |

### 3.4 Execution

| ID | Story | Priority |
|----|-------|----------|
| US-15 | As a user, I can manually trigger a test run of my workflow from the editor and see real-time progress as each step executes, including parallel branches. | P0 |
| US-16 | As a user, I can see each step's status (success/failed/skipped) with green, red, or gray indicators after execution, including per-branch status for parallel paths. | P0 |
| US-17 | As a user, I can click any executed step to see its input data and output data in JSON or table view. For Loop nodes, I can see per-iteration data. | P0 |
| US-18 | As a user, when a step fails, I see a friendly error message explaining what went wrong and a suggested fix. | P0 |
| US-19 | As a user, I can retry a failed execution from the failed step (not from the beginning). | P1 |
| US-20 | As a user, I can cancel a running execution. | P1 |

### 3.5 Execution History

| ID | Story | Priority |
|----|-------|----------|
| US-21 | As a user, I can view a history of all executions across all workflows, filterable by status (success/failed) and by workflow. | P0 |
| US-22 | As a user, I can click any past execution to see its full execution monitor view with per-step data, including branch paths taken. | P0 |
| US-23 | As a user, I can re-run any past execution. | P1 |

### 3.6 Credentials

| ID | Story | Priority |
|----|-------|----------|
| US-24 | As a user, I can add credentials for Telegram (bot token) and Google (OAuth2) through a guided setup flow. | P0 |
| US-25 | As a user, I can see which workflows use each credential and whether the credential is still valid (connected/expired). | P0 |
| US-26 | As a user, I can test a credential to verify it still works. | P0 |
| US-27 | As a user, I can update or delete credentials. Deleting warns me if workflows depend on it. | P0 |

### 3.7 Dashboard

| ID | Story | Priority |
|----|-------|----------|
| US-28 | As a user, I see a dashboard with stats (total workflows, active count, today's executions, failure count) and a list of my workflows. | P0 |
| US-29 | As a user, I can quickly toggle workflows on/off, run them, or edit them from the dashboard. | P0 |

---

## 4. Functional Requirements

### 4.1 Workflow Editor

**FR-01: Free-Form Horizontal Canvas (React Flow)**
Workflows are displayed on a full-viewport React Flow canvas with nodes flowing left-to-right. Nodes are connected by edges with "+" insertion points at edge midpoints. Users can freely drag and reposition individual nodes on the canvas. An auto-layout system (powered by dagre) positions nodes in a clean left-to-right DAG layout, and re-runs when nodes are added or removed. When an IF/Condition node is present, the auto-layout splits into two branches positioned vertically (true branch above, false branch below) with colored labeled edges. Loop body nodes are connected inline as individual nodes with distinct "Loop" edges. The canvas includes standard React Flow controls: zoom, pan, minimap, and fit-to-view.

**FR-02: Node Picker Modal**  
Clicking a placeholder or the "+" button opens a full-screen modal with two steps:
1. **Choose App**: A searchable grid of available apps/tools, organized into "Popular", "Tools & Logic", and "Flow Control" sections.
2. **Choose Event**: After selecting an app, a list of available events/actions for that app, each with a plain-English description. User selects one and clicks "Continue."

**FR-03: Node Card States**  
Each node card displays:
- Status indicator: green checkmark (configured & tested), yellow dot (needs configuration), red X (error/test failed), dashed outline (placeholder)
- App icon and name
- Step number and event description
- "..." menu for delete, disable, duplicate, move up/down
- Border state: default gray (idle), purple (trigger), orange (currently editing), dashed (placeholder), blue (flow control: Loop, Wait, Merge)

**FR-04: Auto-numbering**  
Steps are numbered sequentially (1, 2, 3, ...) and re-number automatically when steps are added, removed, or reordered. Within parallel branches, numbering uses a sub-notation (e.g., 3a.1, 3a.2 for the true branch; 3b.1, 3b.2 for the false branch).

**FR-05: Branch Visualization**
When an IF node is placed, the auto-layout positions two branch paths to the right of it:
- **True branch** (upper path): connected by a green edge labeled "True"
- **False branch** (lower path): connected by a gray edge labeled "False"
- Each branch edge has a "+" insertion point for adding steps to that branch
- A Merge node (or the next sequential node after the branch) receives edges from both branches, visually converging the flow
- Branch nodes can be dragged to custom positions while maintaining their edge connections

**FR-06: Loop Body Visualization**
When a Loop node is placed, its body nodes are connected inline as individual nodes to the right:
- The Loop node connects to its first body node via a distinct blue dashed edge labeled "Loop"
- Body nodes connect sequentially like regular nodes
- The last body node connects to the next node after the loop via a "Loop Complete" edge
- Loop body nodes can be dragged and repositioned like any other node
- The Loop node card displays a summary of its configuration (e.g., "For each item in rows")

### 4.2 Node Configuration Panel

**FR-07: Right Drawer Panel**  
Clicking a configured node opens a right-side panel (approximately 400px wide) with tabs: Settings, Input, Output, Error Handling.

**FR-08: Dynamic Form Rendering**  
The Settings tab renders form fields dynamically based on the selected node type's property definitions. Field types: text, number, boolean (toggle), select dropdown, JSON editor, multiline text.

**FR-09: Variable Picker**  
The "Insert Variable" button opens a popup that lists all fields from all previous steps (including parent scope for nodes inside loops or branches), grouped by step, showing field name and sample value from the last test run. Clicking a field inserts a `{{ $steps[N].json.fieldName }}` expression into the current field. Inside a Loop body, the picker also shows `$item` (current iteration item) and `$index` (current iteration index).

**FR-10: Test Step**  
Each node has a "Test This Step" button that executes only that node using input data from the previous step's last test output (or manual sample data if no test has been run).

### 4.3 Execution Engine

**FR-11: DAG Resolution**  
The engine resolves execution order using topological sorting (Kahn's algorithm). The engine supports sequential execution, parallel branch execution (IF true/false branches run concurrently via `Promise.all`), loop iteration, wait/pause, and merge aggregation.

**FR-12: Parallel Branch Execution**  
When encountering an IF/Condition node:
1. Evaluate the condition
2. If only one branch has downstream nodes, execute that branch only
3. If both branches have downstream nodes connected, execute the matching branch (true or false). The non-matching branch's nodes are marked "skipped."
4. When both branches complete (or are skipped), continue to the Merge node or the next node after the branch.

**FR-13: Loop Execution**  
When encountering a Loop node:
1. **Array mode**: Resolve the input expression to an array. For each item, execute all child nodes in the loop body sequentially, passing `$item` and `$index` as context.
2. **Count mode**: Execute the loop body N times (N configured by user), passing `$index` as context.
3. After all iterations complete, the Loop node outputs an array of all iteration results.
4. **Safety limits**: Max 1,000 iterations per loop (MVP). Exceeding this halts execution with a clear error.

**FR-14: Wait Execution**  
When encountering a Wait node:
1. **Duration mode**: Pause the execution for the configured time (seconds/minutes/hours). The BullMQ job is delayed — the worker is not blocked.
2. **Webhook-resume mode** (P1): The execution is suspended and a unique resume URL is generated. When an HTTP request hits that URL, the execution resumes from the Wait node with the request data as output.
3. Max wait time: 24 hours (MVP). Executions waiting longer are auto-cancelled.

**FR-15: Merge Execution**  
When encountering a Merge node:
1. Collect outputs from all incoming branches.
2. Merge strategy (configurable): 
   - **Append** (default): Combine all branch outputs into a single array.
   - **Choose branch**: Only pass through the output of the branch that actually executed (useful after IF where only one branch runs).
   - **Combine by key**: Merge objects from each branch by matching a specified key field.

**FR-16: Async Execution via Queue**  
All executions (manual and triggered) are enqueued in BullMQ. A worker process dequeues and runs them. The API returns `202 Accepted` with an execution ID immediately. For Wait nodes in duration mode, the engine uses BullMQ delayed jobs to avoid blocking workers.

**FR-17: Per-Node Execution**  
For each node, the engine:
1. Resolves input data from connected previous nodes (for Merge nodes, resolves from multiple inputs)
2. Evaluates expressions/variables in parameters (including `$item` and `$index` for loop context)
3. Decrypts required credentials
4. Executes the node's logic function
5. Stores output data
6. Emits WebSocket event (node:started, node:finished)
7. Handles errors per the node's error handling setting

**FR-18: Error Handling Modes**  
Each node supports three error handling modes:
- **Stop Workflow** (default): Execution halts, subsequent nodes are marked "skipped."
- **Continue**: Error is logged, execution continues to next node with empty data.
- **Retry**: Re-execute the node up to N times with a configurable delay.

For Loop nodes, an additional error mode is available:
- **Skip Item**: If a single iteration fails, skip it, log the error, and continue to the next iteration.

**FR-19: Execution Timeout**  
Each execution has a maximum runtime (default: 5 minutes for MVP, extended to 30 minutes if a Wait node is present). Exceeding it auto-cancels the execution.

**FR-20: Expression Resolution**  
The engine resolves `{{ ... }}` expressions in node parameters at runtime using a sandboxed evaluator. Expressions can reference:
- `$steps[N].json.fieldName` — output of step N
- `$trigger.json.fieldName` — output of the trigger step
- `$now` — current ISO timestamp
- `$item` — current loop iteration item (only inside Loop body)
- `$index` — current loop iteration index (only inside Loop body)
- `$branches.true.json.fieldName` — output of the true branch (only in Merge node context)
- `$branches.false.json.fieldName` — output of the false branch (only in Merge node context)
- Basic operations: string concatenation, math, ternary

### 4.4 Trigger System

**FR-21: Manual Trigger**  
User clicks "Test Run" in the editor. Engine creates an execution with `mode: 'manual'` and optional sample input data.

**FR-22: Webhook Trigger**  
Each workflow with a Webhook trigger gets a unique URL (`/webhook/:unique-path`). Incoming HTTP requests (POST/GET) trigger the workflow with the request body/query as input data.

**FR-23: Schedule/Cron Trigger**  
User configures a cron expression or picks from presets (every 5 min, hourly, daily at 9am, weekly on Monday, etc.). BullMQ repeatable jobs handle scheduling. Timezone-aware.

**FR-24: Telegram Trigger — New Message**  
Uses Telegram Bot API with long polling (MVP) or webhook. Triggers when the bot receives a new message. Output includes: `message.text`, `message.from`, `message.chat`, `message.date`, `message.photo`, `message.document`.

### 4.5 MVP Node Specifications

#### 4.5.1 Core Nodes

**Manual Trigger**
- Properties: Sample data (optional JSON)
- Output: The sample data or empty object

**Webhook Trigger**
- Properties: HTTP method filter (GET/POST/any), path (auto-generated), response mode (immediately / after workflow)
- Output: `{ headers, query, body, method, url }`

**Schedule Trigger**
- Properties: Cron expression or preset selector, timezone
- Output: `{ timestamp, scheduledTime }`

**HTTP Request**
- Properties: URL, method (GET/POST/PUT/DELETE/PATCH), headers (key-value), query params (key-value), body (JSON/form/raw), authentication (none/basic/bearer/API key), timeout
- Output: `{ statusCode, headers, body, responseTime }`

**IF / Condition**
- Properties: Conditions array — each condition has: field (expression), operation (equals, not equals, contains, greater than, less than, is empty, is not empty, regex), value. Combine mode: AND / OR.
- Outputs: Two branches — `true` and `false`. Each branch supports multiple downstream nodes connected via the branch's "+" insertion point.
- Behavior: Evaluates condition. Routes execution to the matching branch. The non-matching branch's nodes are marked "skipped." Both branches converge at a Merge node or at the next node after the branch closure.

**Set / Transform**
- Properties: Fields to set — array of `{ name, value }` pairs. Values support expressions.
- Output: The constructed object with the defined fields.

**Code (JavaScript)**
- Properties: JavaScript code editor, input fields mapping
- Execution: Runs in isolated-vm sandbox with 128MB memory limit and 10-second timeout.
- Available in sandbox: `$input` (input data), `$steps` (previous steps data), `$item` (in loop context), `$index` (in loop context). No `require`, `fs`, `process`.
- Output: Whatever the code returns.

#### 4.5.2 Flow Control Nodes

**Loop**
- Category: Flow Control
- Properties:
  - **Mode**: `forEach` (iterate over array) or `count` (repeat N times)
  - **Source** (forEach mode): Expression resolving to an array, e.g., `{{ $steps[2].json.rows }}`
  - **Count** (count mode): Integer or expression, e.g., `5` or `{{ $steps[1].json.pageCount }}`
  - **Batch size** (optional): Process N items concurrently within the loop. Default: 1 (sequential). Max: 10.
  - **On item error**: `stopAll` (stop entire workflow), `skipItem` (skip failed item, continue loop), `stopLoop` (stop loop, continue workflow)
- Behavior: The Loop node contains a body of child nodes. For each iteration, all child nodes execute sequentially. The Loop node collects results from all iterations.
- Output: `{ items: [/* array of each iteration's final output */], totalIterations, failedCount }`
- UI: Rendered as an enclosing container in the editor. Inside the container, nodes can be added/removed like a normal flow.

**Wait**
- Category: Flow Control
- Properties:
  - **Mode**: `duration` (wait for fixed time) or `webhookResume` (wait for external event — P1)
  - **Duration** (duration mode): Value + unit selector (seconds, minutes, hours)
  - **Max wait time**: Default 24 hours. Configurable.
  - **Resume webhook path** (webhookResume mode, P1): Auto-generated unique URL. Displayed in the config panel.
- Behavior (duration mode): The engine schedules a BullMQ delayed job. The worker picks up the job after the delay and continues execution. No worker thread is blocked.
- Behavior (webhookResume mode, P1): The engine serializes execution state, suspends the execution, and registers a one-time resume webhook. When called, execution continues from the Wait node with the webhook payload as output.
- Output (duration mode): `{ waitedMs, resumedAt }`
- Output (webhookResume mode): `{ resumedAt, webhookPayload: { headers, body, query } }`

**Merge**
- Category: Flow Control
- Properties:
  - **Mode**: `append` (combine all inputs into array), `chooseBranch` (pass through whichever branch executed), `combineByKey` (merge objects by key)
  - **Key field** (combineByKey mode): The field name to join on
  - **Wait for all**: Boolean (default: true). If true, waits for all incoming branches to complete before proceeding. If false, proceeds as soon as any branch completes (first-wins).
- Behavior: The Merge node has multiple inputs (one per incoming branch). It collects the output data from each branch and combines them according to the selected mode.
- Output (append mode): `{ items: [branchAOutput, branchBOutput, ...] }`
- Output (chooseBranch mode): The output of whichever branch ran (the non-skipped branch)
- Output (combineByKey mode): The merged object
- UI: Rendered as a special node with multiple incoming connector lines from the branches above. Visually indicates convergence.

#### 4.5.3 Telegram Nodes

**Telegram Trigger — New Message**
- Credential: Telegram Bot Token
- Properties: Chat filter (all chats / specific chat IDs), message type filter (text only / all)
- Output: `{ messageId, text, from: { id, firstName, lastName, username }, chat: { id, type, title }, date, photo?, document? }`

**Telegram — Send Message**
- Credential: Telegram Bot Token
- Properties: Chat ID (expression-enabled), message text (expression-enabled, supports Markdown), parse mode (Markdown/HTML/plain), disable notification (boolean), reply to message ID (optional)
- Output: `{ messageId, date, chat }`

**Telegram — Edit Message**
- Credential: Telegram Bot Token
- Properties: Chat ID, message ID, new text
- Output: `{ messageId, date }`

**Telegram — Send Photo**
- Credential: Telegram Bot Token
- Properties: Chat ID, photo URL or file, caption (optional)
- Output: `{ messageId, photo }`

#### 4.5.4 Google Sheets Nodes

**Google Sheets — Append Row**
- Credential: Google OAuth2
- Properties: Spreadsheet ID (or picker), sheet name, columns-to-values mapping (dynamic — user maps column headers to values/expressions)
- Output: `{ updatedRange, updatedRows, updatedColumns }`

**Google Sheets — Read Rows**
- Credential: Google OAuth2
- Properties: Spreadsheet ID, sheet name, range (optional, default: all), filter conditions (optional — column, operation, value)
- Output: `{ rows: [{ column1: value, column2: value, ... }], totalRows }`

**Google Sheets — Update Row**
- Credential: Google OAuth2
- Properties: Spreadsheet ID, sheet name, row number or lookup (find row where column X = value), columns-to-values mapping
- Output: `{ updatedRange, updatedRows }`

**Google Sheets — Get Spreadsheet Info**
- Credential: Google OAuth2
- Properties: Spreadsheet ID
- Output: `{ title, sheets: [{ name, rowCount, columnCount }], url }`

### 4.6 Credential System

**FR-25: Credential Types**

| Type | Auth Method | Fields | Token Refresh |
|------|------------|--------|---------------|
| Telegram Bot | API Token | Bot token | Not needed (tokens don't expire) |
| Google (Sheets) | OAuth2 | Client ID, Client Secret, Access Token, Refresh Token, Scopes | Auto-refresh when access token expires |

**FR-26: Encryption**  
All credential data is encrypted at rest using AES-256-GCM. The encryption key is stored as an environment variable, never in the database.

**FR-27: OAuth2 Flow**  
For Google credentials:
1. User clicks "Connect Google Account"
2. Backend redirects to Google's OAuth consent screen with scopes: `spreadsheets`, `drive.readonly`
3. User approves
4. Backend receives auth code, exchanges for access + refresh tokens
5. Tokens are encrypted and stored
6. On each API call, if access token is expired, auto-refresh using refresh token

**FR-28: Credential Validation**  
"Test" button per credential makes a lightweight API call (e.g., `getMe` for Telegram, list spreadsheets for Google) to verify the credential is still valid.

### 4.7 Real-Time Updates

**FR-29: WebSocket Events**  
The backend pushes execution events over WebSocket:

| Event | Payload | When |
|-------|---------|------|
| `execution:started` | `{ executionId, workflowId }` | Execution begins |
| `node:started` | `{ executionId, nodeId, stepIndex, branchPath? }` | A node starts executing |
| `node:finished` | `{ executionId, nodeId, stepIndex, status, outputPreview, duration, branchPath? }` | A node finishes |
| `loop:iteration` | `{ executionId, nodeId, currentIndex, totalItems, status }` | A loop iteration completes |
| `wait:started` | `{ executionId, nodeId, resumeAt?, resumeWebhookUrl? }` | A Wait node begins waiting |
| `wait:resumed` | `{ executionId, nodeId, waitedMs }` | A Wait node resumes |
| `execution:finished` | `{ executionId, status, totalDuration, error? }` | Execution completes or fails |

**FR-30: WebSocket Authentication**  
WebSocket connections are authenticated via the same session cookie as the REST API. Unauthenticated connections are rejected.

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target |
|--------|--------|
| Workflow editor load time | < 2 seconds |
| Node picker modal open | < 300ms |
| Execution start (manual trigger to first node executing) | < 1 second |
| Per-node execution overhead (engine, not external API) | < 50ms |
| WebSocket event delivery latency | < 200ms |
| Dashboard load time | < 1.5 seconds |
| Canvas render (React Flow) | < 200ms for up to 50 nodes with auto-layout |

### 5.2 Scalability (MVP)

- Support up to 100 concurrent users
- Support up to 1,000 workflows total
- Support up to 10,000 executions per day
- Queue concurrency: 10 simultaneous workflow executions
- Execution history retention: 30 days (configurable)
- Max nodes per workflow: 50
- Max nesting depth (branches/loops): 3 levels
- Max loop iterations: 1,000 per loop node

### 5.3 Security

- All credentials encrypted at rest (AES-256-GCM)
- HTTPS enforced on all endpoints
- Session-based authentication with httpOnly, secure, sameSite cookies
- CSRF protection on all state-changing endpoints
- Rate limiting: 100 API calls/minute per user, 30 webhook triggers/minute per workflow
- Code node sandboxing: isolated-vm with memory and time limits
- No credential values ever appear in logs, error messages, or API responses
- Wait node resume webhooks include HMAC signature verification

### 5.4 Reliability

- Stalled job detection: BullMQ detects crashed workers and reassigns jobs within 30 seconds
- Automatic retry on infrastructure failure (not node logic failure): up to 3 times with exponential backoff
- Database connection pooling with automatic reconnection
- Graceful shutdown: in-flight executions complete before worker exits
- Wait node durability: execution state is persisted so that a server restart does not lose waiting executions

### 5.5 Usability

- All interactions achievable without writing code (Code node is optional for power users)
- Error messages in plain English with actionable fix suggestions
- All forms validate inline with clear error states
- Responsive layout: minimum supported width 1024px (desktop-first, tablet-acceptable)
- Keyboard navigation support for modal and form interactions
- Maximum 3 clicks from dashboard to running a workflow
- Parallel branches use colored labeled edges (green for true, gray for false) so users understand flow paths. Auto-layout keeps the canvas organized.

---

## 6. Technical Architecture Overview

### 6.1 Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+, TypeScript, Vite, Zustand, TanStack Query, Tailwind CSS, shadcn/ui, CodeMirror 6, React Flow (@xyflow/react), dagre |
| Backend | Hono, Node.js 20+, TypeScript, Drizzle ORM, Zod |
| Database | PostgreSQL 16 |
| Queue | BullMQ + Redis 7 |
| Real-time | WebSocket (Hono adapter) |
| Auth | Better Auth (session-based) |
| Encryption | Node.js crypto (AES-256-GCM) |
| Sandbox | isolated-vm |
| Infrastructure | Docker + Docker Compose |

### 6.2 Deployment Architecture

```
                    ┌──────────────┐
                    │   Caddy       │
                    │  (reverse     │
                    │   proxy +     │
                    │   HTTPS)      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    ┌─────────▼──┐  ┌──────▼─────┐  ┌──▼──────────┐
    │  Frontend   │  │  Hono API  │  │  Webhook     │
    │  (Static)   │  │  Server    │  │  Handler     │
    └────────────┘  └──────┬─────┘  └──┬──────────┘
                           │           │
                    ┌──────▼───────────▼──┐
                    │      Redis          │
                    │  (BullMQ Queue)     │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │  Worker Process(es)  │
                    │  (Execution Engine)  │
                    └──────┬──────────────┘
                           │
                    ┌──────▼──────────────┐
                    │    PostgreSQL        │
                    └─────────────────────┘
```

---

## 7. Data Model Overview

See the full ERD document for detailed schema. Key entities:

- **User**: Authentication and ownership
- **Workflow**: The workflow definition (nodes, connections, settings stored as JSONB)
- **Execution**: A single run of a workflow with per-node execution data, including branch tracking and wait state
- **Credential**: Encrypted third-party credentials
- **Webhook**: Registered webhook endpoints mapped to workflows (includes resume webhooks for Wait nodes)

---

## 8. MVP Milestones

### Phase 1 — Foundation (Weeks 1–3)

- [ ] Project scaffolding (monorepo, frontend, backend, shared types)
- [ ] Database schema and migrations
- [ ] User authentication (register, login, logout, sessions)
- [ ] Workflow CRUD API
- [ ] Dashboard UI with workflow list
- [ ] Basic workflow editor with linear vertical layout and placeholder cards

### Phase 2 — Node System & Editor (Weeks 4–6)

- [ ] Node type registry and definition system
- [ ] Node picker modal (app selection → event selection) including Flow Control category
- [ ] Node configuration panel (right drawer)
- [ ] Dynamic form rendering from node property definitions
- [ ] Variable picker popup with field mapping (including `$item`, `$index` context)
- [ ] Implement core nodes: Manual Trigger, Webhook, Schedule, HTTP Request, IF, Set, Code
- [ ] Implement flow control nodes: Loop, Wait, Merge

### Phase 3 — Branching Editor & Execution Engine (Weeks 7–10)

- [ ] Branch visualization UI: IF node splits into true/false parallel branches
- [ ] Loop body visualization UI: enclosed container with child nodes
- [ ] Merge node visualization UI: converging connectors
- [ ] Execution engine core: DAG resolution with branch/merge/loop support
- [ ] Parallel branch execution (evaluate condition → execute matching branch → skip other)
- [ ] Loop execution engine (forEach and count modes, iteration tracking)
- [ ] Wait node engine (duration mode with BullMQ delayed jobs)
- [ ] Merge node engine (append, chooseBranch, combineByKey)
- [ ] Expression resolver (sandboxed, including `$item`, `$index`, `$branches`)
- [ ] BullMQ queue integration for async execution
- [ ] WebSocket real-time execution events (including branch, loop, wait events)
- [ ] Execution monitor UI (live step-by-step progress with branch visualization)
- [ ] Per-node input/output inspector (including per-iteration data for loops)

### Phase 4 — Integrations (Weeks 11–12)

- [ ] Credential management UI and encrypted storage
- [ ] Telegram Bot Token credential type
- [ ] Telegram nodes: Trigger (New Message), Send Message, Edit Message, Send Photo
- [ ] Google OAuth2 flow
- [ ] Google Sheets nodes: Append Row, Read Rows, Update Row, Get Spreadsheet Info

### Phase 5 — Polish & Launch (Weeks 13–16)

- [ ] Wait node webhook-resume mode (P1)
- [ ] Execution history page with filters and error diagnostics
- [ ] Friendly error messages with fix suggestions for all node types (including loop/branch errors)
- [ ] Test-single-step feature for all nodes
- [ ] Workflow duplication
- [ ] Credential validation (test button)
- [ ] Rate limiting, input validation, security hardening
- [ ] Performance optimization and load testing
- [ ] Loop safety limits and circuit breakers
- [ ] Bug fixes, edge cases, UX polish

---

## 9. Success Metrics

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Registered users | 500+ |
| Active workflows (running at least 1x/week) | 200+ |
| Workflows using branching/loop/merge features | > 30% of all workflows |
| Workflow creation completion rate | > 60% of started workflows are activated |
| Average time to first active workflow | < 10 minutes |
| Execution success rate | > 95% |
| User-reported "confusing" errors | < 5% of total errors |

---

## 10. Out of Scope (MVP)

The following are explicitly excluded from the MVP but planned for future iterations:

- More than 2 integration platforms
- Team/organization features (shared workflows, RBAC)
- Workflow versioning and rollback
- Workflow templates gallery
- Public API for programmatic workflow management
- Mobile-optimized UI
- Notifications (email/push on execution failure)
- Usage analytics dashboard
- Billing and subscription management
- Switch/Router node (multi-way branching beyond true/false)
- Advanced loop types (while loop with dynamic condition, recursive loops)
- Parallel execution of multiple independent branches (beyond IF true/false)

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google OAuth2 approval takes too long | Blocks Sheets integration | Use test/development mode initially; begin verification process early |
| Telegram rate limits (30 msg/sec globally for bots) | Workflows fail silently | Implement per-bot rate limiting in queue; surface clear error |
| Large execution data (many rows from Sheets) causes performance issues | Slow UI, high memory | Paginate output data; cap at 1,000 rows per read; stream large results |
| Users create infinite loops via Schedule trigger + Webhook call to self | Resource exhaustion | Detect self-referential webhook calls; max execution time; circuit breaker |
| Expression injection / Code node abuse | Security breach | Sandboxed evaluation; isolated-vm with strict limits; no network access from Code node |
| Loop nodes with large arrays cause resource exhaustion | Worker memory/CPU spike | Hard cap at 1,000 iterations; per-iteration memory monitoring; execution timeout |
| Branch visualization becomes confusing with deep nesting | Poor UX | Cap nesting at 3 levels; clear visual containment; breadcrumb navigation |
| Wait nodes with long durations cause stale execution state | Data inconsistency | Persist execution state to DB; validate state on resume; auto-cancel after 24h |
| Merge node receives data from branches that ran at very different times | Unexpected merge results | Show clear timestamps per branch; validate freshness; default to "wait for all" |

---

## Appendices

- **Appendix A**: Full ERD — See `ERD.md`
- **Appendix B**: Frontend Specification — See `FRONTEND_SPEC.md`
