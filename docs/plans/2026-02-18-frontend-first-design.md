# FlowForge — Frontend-First Design
**Date:** 2026-02-18
**Scope:** Complete frontend implementation using local state / localStorage to simulate backend
**Goal:** Build all pages and UI flows exactly as they will appear in the final fullstack version

---

## 1. Approach

Build the complete FlowForge frontend before any backend exists. Use a mock service layer backed by localStorage to simulate async API behavior. When the real backend is ready, only `src/services/` changes — all hooks, stores, and components remain untouched.

**Build priority:** Dashboard → Workflow Editor → Execution Monitor → Auth → Execution History → Credentials → Settings

---

## 2. Tech Stack

| Purpose | Library | Version |
|---------|---------|---------|
| Framework | React | 18+ |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| State Management | Zustand | 4.x |
| Server State | TanStack Query | 5.x |
| Routing | React Router | 6.x |
| UI Components | shadcn/ui + Radix | Latest |
| Styling | Tailwind CSS | 3.x |
| Forms | React Hook Form + Zod | Latest |
| Code Editor | CodeMirror 6 | Latest |
| Icons | Lucide React | Latest |
| Toasts | Sonner | Latest |
| HTTP Client | ky | Latest |
| Date Handling | date-fns | Latest |

---

## 3. Data Layer

### 3.1 localStorage Schema

Each entity has its own namespaced key:

```
flowforge:user            → User
flowforge:workflows       → Workflow[]
flowforge:executions      → Execution[]
flowforge:node_executions → NodeExecution[]
flowforge:credentials     → Credential[]
```

### 3.2 Storage Helper (`src/lib/storage.ts`)

Typed wrapper with four operations:
- `get<T>(key)` — read and deserialize
- `set<T>(key, value)` — serialize and write
- `update<T extends {id: string}>(key, id, patch)` — partial update by id
- `remove(key, id)` — delete by id

### 3.3 Mock Service Pattern (`src/services/`)

Every service function:
1. Awaits a simulated network delay (`delay(200–500ms)`)
2. Reads/writes via `storage`
3. Falls back to seed data if localStorage is empty

```ts
// Example
export const getWorkflows = async (): Promise<Workflow[]> => {
  await delay(300)
  return storage.get('flowforge:workflows') ?? seedWorkflows
}
```

TanStack Query wraps every service call in `useQuery` / `useMutation` hooks — giving real loading states, error boundaries, and cache invalidation throughout the app.

### 3.4 Seed Data (`src/mocks/`)

Pre-populated on first load:
- 3 sample workflows (one with IF branch, one with Loop, one simple linear)
- 5 executions (mix of success, failed, running)
- 2 credentials (one Telegram bot, one Google OAuth placeholder)
- 1 user (demo@flowforge.app)

---

## 4. Project Structure

```
src/
├── app/
│   ├── routes/                    # Page components
│   │   ├── dashboard.tsx
│   │   ├── workflow-editor.tsx
│   │   ├── execution-monitor.tsx
│   │   ├── execution-history.tsx
│   │   ├── credentials.tsx
│   │   ├── settings.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── layouts/
│   │   ├── AppLayout.tsx          # Sidebar + main content
│   │   ├── AuthLayout.tsx         # Centered card, no sidebar
│   │   └── EditorLayout.tsx       # Full-screen, top bar only
│   └── router.tsx                 # Route definitions + ProtectedRoute
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── shared/                    # StatusBadge, JsonViewer, EmptyState, etc.
│   ├── workflow/                  # NodeCard, NodePickerModal, NodeConfigPanel, BranchContainer, LoopContainer
│   └── execution/                 # ExecutionTimeline, NodeExecutionRow
├── hooks/                         # TanStack Query hooks
│   ├── useWorkflows.ts
│   ├── useExecutions.ts
│   └── useCredentials.ts
├── services/                      # Mock async functions (swap for real API later)
│   ├── workflowService.ts
│   ├── executionService.ts
│   ├── credentialService.ts
│   └── authService.ts
├── stores/                        # Zustand stores (UI state only)
│   ├── editorStore.ts             # Active node, panel open state, canvas state
│   └── executionStore.ts          # Simulated real-time execution state
├── lib/
│   ├── storage.ts                 # localStorage helpers
│   ├── delay.ts                   # Simulated network delay
│   └── utils.ts                   # cn(), formatters, etc.
├── mocks/                         # Seed data and fixtures
│   ├── workflows.ts
│   ├── executions.ts
│   └── credentials.ts
└── types/                         # Shared TypeScript types
    ├── workflow.ts
    ├── execution.ts
    ├── credential.ts
    └── user.ts
```

---

## 5. Routing

```
/                              → redirect to /dashboard
/login                         → AuthLayout > LoginPage
/register                      → AuthLayout > RegisterPage
/dashboard                     → AppLayout > DashboardPage
/workflows/new                 → EditorLayout > WorkflowEditorPage (new)
/workflows/:id/edit            → EditorLayout > WorkflowEditorPage (existing)
/workflows/:id/executions      → AppLayout > ExecutionHistoryPage
/executions/:id                → AppLayout > ExecutionMonitorPage
/credentials                   → AppLayout > CredentialsPage
/settings                      → AppLayout > SettingsPage
```

**ProtectedRoute** — checks for `flowforge:user` in localStorage. Redirects to `/login` if absent.

**Layouts:**
- `AuthLayout` — centered card, clean background, no navigation
- `AppLayout` — dark sidebar (`#1e1e1e`) with logo, nav links, user avatar at bottom
- `EditorLayout` — full-screen with top bar (workflow name, Save, Run buttons), no sidebar

---

## 6. Pages & Components

### 6.1 Dashboard (`/dashboard`)

- Stats bar: total workflows, active workflows, executions today, success rate
- Workflow card grid: name, status badge, last run time, execution count
- Card actions: Edit, Run Now, Toggle active/inactive, Delete
- Empty state: "Create your first workflow" CTA
- "New Workflow" button → creates blank workflow in storage, redirects to editor

### 6.2 Workflow Editor (`/workflows/:id/edit`)

**Top bar:** Workflow name (inline editable), Save button, Run button, back arrow, active toggle

**Canvas (center):** Vertical scrollable list of node cards connected by lines with "+" insertion points between them

**Node card states:**
- Green checkmark border — configured & tested
- Yellow dot — needs configuration
- Red X — error / test failed
- Dashed outline — placeholder
- Purple accent — trigger node
- Blue accent — flow control node (Loop, Wait, Merge)
- Orange border — currently selected/editing

**Node Picker Modal** (appears on "+" or placeholder click):
1. Choose App: searchable grid, categorized (Triggers / Actions / Flow Control / Integrations)
2. Choose Event: list of events for selected app with descriptions

**Branch Visualization (IF node):**
- Two side-by-side columns below the IF card
- True branch: green "✓ True" label
- False branch: slate "✗ False" label
- Each branch has its own "+" insertion points
- Converges at Merge node

**Loop Container:**
- Enclosed container with subtle blue background (`#f0f7ff`)
- Header shows loop config summary
- Inner nodes stacked vertically with their own "+" points

### 6.3 Node Config Panel

Right drawer, ~400px wide, 4 tabs: **Settings · Input · Output · Error Handling**

All text/expression fields include an "Insert Variable" button that opens a variable picker popup showing fields from all previous steps grouped by step name, with sample values.

"Test This Step" button at drawer footer.

#### Node Config — Settings Tab Detail

**Manual Trigger**
- JSON editor: optional sample input data
- "Use this sample" button to seed the variable picker

**Webhook Trigger**
- Path: auto-generated (read-only + copy button)
- HTTP Method: select (GET / POST / Any)
- Response Mode: select (Immediately / After workflow completes)

**Schedule Trigger**
- Preset selector: Every 5 min / Hourly / Daily / Weekly / Monthly / Custom
- Custom cron field: text input with live human-readable preview ("Runs every day at 9:00 AM")
- Timezone: searchable dropdown

**HTTP Request**
- URL: text field with variable picker
- Method: select (GET / POST / PUT / DELETE / PATCH)
- Headers: dynamic key-value rows (add/remove)
- Query Params: dynamic key-value rows (add/remove)
- Body: type toggle (JSON / Form / Raw) + editor area
- Authentication: select (None / Bearer / Basic / API Key)
  - Bearer: token field
  - Basic: username + password fields
  - API Key: key name + value + placement (header/query)
- Timeout: number input (ms)

**IF / Condition**
- Combinator: AND / OR toggle
- Condition rows (add/remove): each row has:
  - Field: expression input with variable picker
  - Operation: select (equals / not equals / contains / greater than / less than / is empty / is not empty / regex)
  - Value: text input (hidden for is empty / is not empty)

**Set / Transform**
- Field rows (add/remove): name input + value input with variable picker
- Live preview of output object

**Code (JavaScript)**
- Context hint (read-only): available variables (`$input`, `$steps`, `$item`, `$index`)
- Input mapping table: map named inputs to step expressions
- CodeMirror 6 editor with JS syntax highlighting

**Loop**
- Mode toggle: forEach / Count
- forEach: Source expression field (array path, with variable picker)
- Count: number input or expression
- Batch size: number input (1–10, default 1)
- On item error: select (Stop all / Skip item / Stop loop)

**Wait**
- Mode toggle: Duration / Webhook Resume
- Duration: number input + unit select (seconds / minutes / hours)
- Webhook Resume: auto-generated URL (read-only + copy), labeled as P1 / coming soon

**Merge**
- Strategy: select (Append outputs / Choose executing branch / Combine by key)
- "Combine by key" reveals: key field text input

**Telegram / Google Sheets (Integration nodes)**
- Credential selector dropdown (with "Add credential" inline link)
- "Configuration coming soon" placeholder panel with node description

### 6.4 Execution Monitor (`/executions/:id`)

- Header: workflow name, status badge, start time, duration
- Node timeline: each node shows status icon, name, duration, expandable input/output JSON
- Simulated real-time: `setTimeout` sequence drives node completion in Zustand store; UI re-renders reactively
- Failed node: red highlight + plain-English error + suggested fix action
- Branch visualization: both branches visible; non-taken branch nodes shown as "Skipped" in gray

### 6.5 Execution History (`/workflows/:id/executions`)

- Filter bar: status (All / Success / Failed / Running), date range
- Execution list: timestamp, status badge, duration, trigger type
- Click row → navigates to Execution Monitor for that run

### 6.6 Credentials (`/credentials`)

- Credential cards: name, type (Telegram / Google), status (Connected / Expired), workflows using it
- Add credential: type selector → guided form (Telegram: bot token field; Google: placeholder OAuth flow)
- Test, Edit, Delete actions per credential

### 6.7 Settings (`/settings`)

- Profile: name, email (read-only in mock), avatar initial
- Password change form (mock — saves nothing, shows success toast)
- Danger zone: "Delete account" button (mock — clears localStorage, redirects to login)

---

## 7. Simulated Real-Time Execution

The Execution Monitor simulates live node progression without WebSockets:

1. "Run" creates an execution record in localStorage with status `running`
2. `executionStore` (Zustand) holds the live execution state
3. A `simulateExecution(workflowId)` function in `executionService` walks the workflow's nodes, firing `setTimeout` delays per node (200–800ms each)
4. Each node completion dispatches a store update → UI re-renders
5. On completion, final status written back to localStorage

---

## 8. Implementation Sequence

| Phase | Scope |
|-------|-------|
| 1 | Scaffold (Vite, deps, Tailwind, shadcn/ui, folder structure) |
| 2 | Types + Storage helpers + Seed data |
| 3 | Mock Services (workflow, execution, credential, auth) |
| 4 | Layouts + Routing + ProtectedRoute |
| 5 | Auth pages (Login, Register) |
| 6 | Dashboard |
| 7 | Workflow Editor — canvas + node cards + Node Picker modal |
| 8 | Workflow Editor — Node Config panel (all node types) |
| 9 | Execution Monitor + simulated real-time |
| 10 | Execution History |
| 11 | Credentials |
| 12 | Settings |
