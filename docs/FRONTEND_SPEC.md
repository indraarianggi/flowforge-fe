# Frontend Specification
# FlowForge — UI/UX & Component Architecture

**Version:** 1.1 MVP (Revised)  
**Framework:** React 18+ / TypeScript / Vite  

---

## 1. Design Principles

### 1.1 Core Philosophy

FlowForge targets non-technical users. Every design decision must pass this test: **"Would someone who has never written code understand what to do next?"**

### 1.2 Design Rules

1. **No code by default.** Every configuration is achievable through dropdowns, toggles, and point-and-click field mapping. The Code node exists for power users but is never required.
2. **Show, don't tell.** After each test run, show the actual data a step produced. Don't describe it — display it.
3. **Structured flow.** Workflows are vertical and top-to-bottom. Branches are visually contained (side-by-side or stacked with labels). Loop bodies are enclosed in visual containers. No free-form canvas. No spaghetti connections.
4. **Errors are fixable, not scary.** Every error message includes: what went wrong (plain English), which step failed, and a suggested fix with an action button.
5. **3-click rule.** Users should reach any workflow's editor in ≤ 3 clicks from the dashboard.
6. **Visual containment.** Branches, loops, and nested structures use clear visual boundaries (borders, backgrounds, indentation) so users always understand scope and hierarchy.

### 1.3 Visual Identity

| Property | Value |
|----------|-------|
| Primary Color | `#4a9eed` (Blue) |
| Secondary Color | `#8b5cf6` (Purple — used for triggers/expressions) |
| Success | `#22c55e` (Green) |
| Warning | `#f59e0b` (Amber) |
| Error | `#ef4444` (Red) |
| Background | `#f5f5f5` (Light gray canvas) |
| Card Background | `#ffffff` |
| Sidebar | `#1e1e1e` (Dark) |
| Text Primary | `#1e1e1e` |
| Text Secondary | `#757575` |
| Text Disabled | `#b0b0b0` |
| Border Default | `#e0e0e0` |
| Flow Control Accent | `#3b82f6` (Blue — for Loop, Wait, Merge nodes) |
| Branch True Accent | `#22c55e` (Green) |
| Branch False Accent | `#94a3b8` (Slate gray) |
| Loop Container BG | `#f0f7ff` (Very light blue) |
| Branch Container BG | `#fafafa` (Slightly off-white) |
| Font Family | Inter (sans-serif) |
| Border Radius (cards) | 12px |
| Border Radius (buttons) | 8px |

---

## 2. Technology Stack

| Purpose | Library | Version | Justification |
|---------|---------|---------|---------------|
| Framework | React | 18+ | Component-based UI, hooks ecosystem |
| Language | TypeScript | 5.x | Type safety across frontend |
| Build Tool | Vite | 5.x | Fast HMR, optimized builds |
| State Management | Zustand | 4.x | Lightweight, no boilerplate, great TS support |
| Server State | TanStack Query | 5.x | Caching, refetching, optimistic updates |
| Routing | React Router | 6.x | Standard routing |
| UI Components | shadcn/ui + Radix | Latest | Accessible, unstyled primitives |
| Styling | Tailwind CSS | 3.x | Utility-first, fast iteration |
| Forms | React Hook Form + Zod | Latest | Performant forms with schema validation |
| Code Editor | CodeMirror 6 | Latest | Expression editor and Code node |
| Icons | Lucide React | Latest | Clean, consistent icon set |
| Toasts | Sonner | Latest | Non-blocking notifications |
| HTTP Client | ky or ofetch | Latest | Lightweight fetch wrapper |
| WebSocket | Native WebSocket | — | Real-time execution updates |
| Date Handling | date-fns | Latest | Lightweight date formatting |

---

## 3. Application Structure

### 3.1 Route Map

```
/                           → Redirect to /dashboard
/login                      → Login page
/register                   → Registration page
/dashboard                  → Dashboard (workflow list + stats)
/workflows/new              → Create new workflow → redirect to editor
/workflows/:id/edit         → Workflow editor
/workflows/:id/executions   → Execution history for a workflow
/executions/:id             → Execution detail / monitor view
/credentials                → Credentials manager
/settings                   → User settings
```

### 3.2 Directory Structure

```
src/
├── app/
│   ├── routes/                    # Route components (pages)
│   │   ├── dashboard.tsx
│   │   ├── workflow-editor.tsx
│   │   ├── execution-monitor.tsx
│   │   ├── execution-history.tsx
│   │   ├── credentials.tsx
│   │   ├── settings.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── layout.tsx                 # App shell with sidebar
│   └── router.tsx                 # Route definitions
│
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── top-bar.tsx
│   │   └── app-shell.tsx
│   │
│   ├── workflow/
│   │   ├── workflow-canvas.tsx        # Vertical structured step list (branches/loops)
│   │   ├── node-card.tsx              # Individual step card
│   │   ├── node-card-placeholder.tsx  # Dashed placeholder card
│   │   ├── step-connector.tsx         # Line + "+" between cards
│   │   ├── node-picker-modal.tsx      # Full modal: app grid → event list
│   │   ├── app-grid.tsx               # Grid of available apps in modal
│   │   ├── event-list.tsx             # List of events after selecting app
│   │   ├── node-status-badge.tsx      # Green check / yellow dot / red X
│   │   ├── branch-container.tsx       # Visual container for IF true/false branches
│   │   ├── branch-column.tsx          # Single branch column (true or false side)
│   │   ├── branch-label.tsx           # "✓ True" / "✗ False" label header
│   │   ├── loop-container.tsx         # Visual container enclosing loop body nodes
│   │   ├── loop-header.tsx            # Loop config summary at top of container
│   │   ├── merge-node-card.tsx        # Special card with converging connectors
│   │   ├── wait-node-card.tsx         # Card showing wait duration/status
│   │   └── nesting-indicator.tsx      # Depth indicator for nested structures
│   │
│   ├── config-panel/
│   │   ├── config-drawer.tsx
│   │   ├── config-tabs.tsx
│   │   ├── dynamic-form.tsx
│   │   ├── field-renderer.tsx
│   │   ├── variable-picker.tsx
│   │   ├── expression-input.tsx
│   │   ├── credential-selector.tsx
│   │   ├── test-step-button.tsx
│   │   ├── loop-config-form.tsx       # Loop settings (mode, source, batch, error)
│   │   ├── wait-config-form.tsx       # Wait settings (mode, duration, unit)
│   │   └── merge-config-form.tsx      # Merge settings (mode, key, wait behavior)
│   │
│   ├── execution/
│   │   ├── execution-canvas.tsx       # Step list with status (branches/loops)
│   │   ├── execution-node-card.tsx
│   │   ├── execution-detail-panel.tsx
│   │   ├── execution-branch-view.tsx  # Which branch path was taken
│   │   ├── execution-loop-view.tsx    # Loop iteration viewer
│   │   ├── execution-wait-view.tsx    # Wait countdown/resume info
│   │   ├── data-viewer.tsx
│   │   ├── iteration-browser.tsx      # Pagination for loop iterations
│   │   ├── timeline-bar.tsx
│   │   └── error-banner.tsx
│   │
│   ├── dashboard/
│   │   ├── stats-cards.tsx
│   │   ├── workflow-list.tsx
│   │   ├── workflow-row.tsx
│   │   └── status-badge.tsx
│   │
│   ├── credentials/
│   │   ├── credential-card.tsx
│   │   ├── credential-form-modal.tsx
│   │   ├── oauth-connect-button.tsx
│   │   └── credential-test-button.tsx
│   │
│   └── common/
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── confirm-dialog.tsx
│       └── search-input.tsx
│
├── stores/
│   ├── workflow-store.ts
│   ├── execution-store.ts
│   ├── ui-store.ts
│   └── auth-store.ts
│
├── api/
│   ├── client.ts
│   ├── workflows.ts
│   ├── executions.ts
│   ├── credentials.ts
│   ├── nodes.ts
│   └── websocket.ts
│
├── hooks/
│   ├── use-workflow.ts
│   ├── use-executions.ts
│   ├── use-execution-ws.ts
│   ├── use-node-types.ts
│   ├── use-credentials.ts
│   └── use-debounce.ts
│
├── lib/
│   ├── node-registry.ts
│   ├── expression-utils.ts
│   ├── branch-utils.ts           # Branch layout calculations
│   ├── loop-utils.ts             # Loop body node management
│   ├── format.ts
│   ├── constants.ts
│   └── validators.ts
│
├── types/
│   ├── workflow.ts
│   ├── execution.ts
│   ├── credential.ts
│   ├── node-definition.ts
│   └── api.ts
│
└── styles/
    └── globals.css
```

---

## 4. State Management Architecture

### 4.1 Zustand Stores

#### WorkflowStore

```typescript
interface WorkflowStore {
  // State
  workflow: Workflow | null;
  isDirty: boolean;
  isSaving: boolean;

  // Actions — Basic
  loadWorkflow: (id: string) => Promise<void>;
  setName: (name: string) => void;
  addNode: (afterStepIndex: number, nodeType: string, eventType: string, parentId?: string, branchSide?: 'true' | 'false') => void;
  removeNode: (nodeId: string) => void;
  updateNodeParameters: (nodeId: string, params: Record<string, any>) => void;
  updateNodeCredential: (nodeId: string, credentialId: string) => void;
  updateNodeErrorHandling: (nodeId: string, config: ErrorHandlingConfig) => void;
  moveNodeUp: (nodeId: string) => void;
  moveNodeDown: (nodeId: string) => void;
  reorderConnections: () => void;
  saveWorkflow: () => Promise<void>;
  toggleActive: () => Promise<void>;

  // Actions — Branching & Flow Control
  addBranchNode: (ifNodeId: string, branchSide: 'true' | 'false', nodeType: string, eventType: string) => void;
  addLoopBodyNode: (loopNodeId: string, nodeType: string, eventType: string) => void;
  removeLoopBodyNode: (loopNodeId: string, bodyNodeId: string) => void;
  insertMergeAfterIF: (ifNodeId: string) => void;

  // Computed
  getBranchNodes: (ifNodeId: string, branchSide: 'true' | 'false') => WorkflowNode[];
  getLoopBodyNodes: (loopNodeId: string) => WorkflowNode[];
  getNodeDepth: (nodeId: string) => number;
}
```

#### UIStore

```typescript
interface UIStore {
  // Config panel
  selectedNodeId: string | null;
  isConfigPanelOpen: boolean;
  configPanelTab: 'settings' | 'input' | 'output' | 'error';

  // Node picker modal
  isNodePickerOpen: boolean;
  nodePickerInsertAfter: number;
  nodePickerContext: {
    parentId?: string;
    branchSide?: 'true' | 'false';
    isLoopBody?: boolean;
  };
  nodePickerStep: 'app' | 'event';
  nodePickerSelectedApp: string | null;

  // Variable picker
  isVariablePickerOpen: boolean;
  variablePickerTargetField: string | null;

  // Collapse state
  collapsedBranches: Set<string>;
  collapsedLoops: Set<string>;

  // Actions
  openConfigPanel: (nodeId: string) => void;
  closeConfigPanel: () => void;
  setConfigTab: (tab: string) => void;
  openNodePicker: (insertAfterStep: number, context?: NodePickerContext) => void;
  closeNodePicker: () => void;
  selectApp: (appType: string) => void;
  openVariablePicker: (fieldName: string) => void;
  closeVariablePicker: () => void;
  toggleBranchCollapse: (ifNodeId: string) => void;
  toggleLoopCollapse: (loopNodeId: string) => void;
}
```

#### ExecutionStore

```typescript
interface ExecutionStore {
  // State
  currentExecution: Execution | null;
  nodeStatuses: Map<string, NodeExecutionStatus>;
  selectedNodeId: string | null;
  isLive: boolean;
  selectedLoopIterations: Map<string, number>;  // nodeId → viewed iteration
  activeWait: { nodeId: string; resumeAt?: string; resumeWebhookUrl?: string } | null;

  // Actions
  startExecution: (workflowId: string) => Promise<string>;
  loadExecution: (executionId: string) => Promise<void>;
  handleWsEvent: (event: ExecutionWsEvent) => void;
  selectNode: (nodeId: string) => void;
  cancelExecution: () => Promise<void>;
  retryFromNode: (nodeId: string) => Promise<void>;
  setLoopIteration: (loopNodeId: string, iteration: number) => void;
}
```

### 4.2 TanStack Query Keys

```typescript
const queryKeys = {
  workflows: {
    all: ['workflows'] as const,
    detail: (id: string) => ['workflows', id] as const,
  },
  executions: {
    byWorkflow: (workflowId: string) => ['executions', 'workflow', workflowId] as const,
    detail: (id: string) => ['executions', id] as const,
  },
  credentials: { all: ['credentials'] as const },
  nodeTypes: { all: ['nodeTypes'] as const },
};
```

---

## 5. Screen Specifications

### 5.1 Dashboard (`/dashboard`)

**Layout:** App shell with sidebar. Main content area.

**Components:**
- `StatsCards`: Four cards in a horizontal row — Total Workflows, Active, Executions Today, Failed Today
- `WorkflowList`: Table with Name, Status badge, Last Run, Actions

**Header Bar:** Title, search input, "+ New Workflow" button.

**Empty State:** Illustrated message with primary CTA button.

---

### 5.2 Workflow Editor (`/workflows/:id/edit`)

**Layout:** App shell with sidebar. Center: workflow canvas (max-width 700px). Right (conditional): config panel drawer (400px).

#### 5.2.1 Top Bar

| Element | Behavior |
|---------|----------|
| Back arrow | Navigate to dashboard |
| Workflow name | Editable inline |
| Active/Inactive toggle | Validates all nodes configured before activating |
| Save button | Disabled when not dirty |
| Test Run button | Triggers manual execution → execution monitor |

#### 5.2.2 Workflow Canvas

The canvas is a centered vertical column of step cards, branch containers, and loop containers.

**Initial State (new workflow):**

```
┌─────────────────────────────┐
│  ⚡ 1. Trigger               │  ← Purple border
│  Select the event that       │
│  starts your workflow        │
└─────────────────────────────┘
         |
        [+]
         |
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│  ⚡ 2. Action                │  ← Dashed border (placeholder)
│  Select the event for        │
│  your workflow to run        │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
         |
        [+]
```

**Branch Layout (IF node with true/false branches and Merge):**

```
┌──────────────────────────────────┐
│  🔀 2. IF — Check Message Type   │
│  If text contains "/start"       │
└──────────────────────────────────┘
         |
    ┌────┴────┐
┌───┴─────────────────────────────┐
│                                  │
│  ┌─ ✓ True ────┐ ┌─ ✗ False ──┐ │
│  │ ┌──────────┐│ │ ┌─────────┐│ │
│  │ │2a. Send  ││ │ │2b. Log  ││ │
│  │ │ Welcome  ││ │ │ to Sheet││ │
│  │ └──────────┘│ │ └─────────┘│ │
│  │     [+]     │ │    [+]     │ │
│  └─────────────┘ └────────────┘ │
│                                  │
└──────────────────────────────────┘
         |
┌──────────────────────────────────┐
│  ⤵ 3. Merge — Combine Results   │
└──────────────────────────────────┘
         |
        [+]
```

**Loop Layout (with body nodes inside a visual container):**

```
┌──────────────────────────────────┐
│  🔄 4. Loop — Process Each Row   │
│  For each item in rows           │
└──────────────────────────────────┘
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Loop Body                (↕)    │  ← Light blue bg, collapse toggle
│                                  │
│  ┌──────────────────────────┐    │
│  │ 4.1 HTTP Request         │    │
│  │     Call API for item    │    │
│  └──────────────────────────┘    │
│           |                      │
│          [+]                     │
│           |                      │
│  ┌──────────────────────────┐    │
│  │ 4.2 Wait — 2 seconds     │    │
│  │     ⏱ 00:02              │    │
│  └──────────────────────────┘    │
│          [+]                     │
│                                  │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
         |
        [+]
```

**Wait Node Card:**

```
┌──────────────────────────────────┐
│  ⏸ 5. Wait — Rate Limit         │  ← Blue border
│  Pause for 30 seconds  ⏱ 00:30  │
└──────────────────────────────────┘
```

**Merge Node Card:**

```
    ┌───┐     ┌───┐
    │   │     │   │       ← Converging lines from branches
    └─┬─┘     └─┬─┘
      └─────┬───┘
┌───────────┴──────────────────────┐
│  ⤵ 3. Merge — Choose Branch     │  ← Blue border
│  Pass through executed branch    │
└──────────────────────────────────┘
```

**Node Card Properties:**
- `status`: 'configured' | 'needs-config' | 'error' | 'placeholder'
- `borderState`: 'default' | 'trigger' | 'editing' | 'placeholder' | 'flowControl'
- `stepLabel`: string (e.g., "2a.1" for branch sub-numbering)
- `nestingDepth`: number (for visual indentation)
- `appName`, `appIcon`, `eventName`
- `onClick`, `onMenuAction`

**Step Connector:**
```typescript
interface StepConnectorProps {
  onInsert: () => void;
  connectorType: 'default' | 'branch-split' | 'branch-merge' | 'loop-start' | 'loop-end';
}
```

**Branch Container:**
```typescript
interface BranchContainerProps {
  ifNodeId: string;
  trueBranchNodes: WorkflowNode[];
  falseBranchNodes: WorkflowNode[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddToBranch: (side: 'true' | 'false') => void;
}
```

**Loop Container:**
```typescript
interface LoopContainerProps {
  loopNodeId: string;
  bodyNodes: WorkflowNode[];
  loopConfig: { mode: string; source?: string; count?: number };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddToBody: () => void;
}
```

#### 5.2.3 Node Picker Modal

Full-screen overlay modal with three sections in Step 1:

**Sections:** "Popular", "Tools & Logic", "Flow Control"

Flow Control section contains: Loop, Wait, Merge.

**Context-aware filtering rules:**
- Step 1 (trigger position): only trigger-capable nodes
- Inside Loop body at max nesting depth: hide Loop and IF nodes
- After an IF with no Merge: show hint to add Merge

On selecting a flow control node:
- **IF**: Creates node + empty branch container below (with true/false placeholders) + auto-inserts a Merge node
- **Loop**: Creates node + empty loop body container below (with placeholder)
- **Merge**: Creates node with connectors from open branches
- **Wait**: Creates standard node

#### 5.2.4 Config Panel

Right-side drawer, 400px wide. Same tabs as before (Settings, Input, Output, Error Handling).

**Loop Node Settings Tab:**

```
┌─────────────────────────────────┐
│  🔄 Loop — Process Items     X  │
│  [Settings] [Input] [Output]    │
│                                 │
│  Loop Mode                      │
│  [For Each Item           ▼]    │
│                                 │
│  Source Array           [expr]  │
│  [{{ $steps[2].json.rows }}   ] │
│  [+ Insert Variable]           │
│                                 │
│  Batch Size                     │
│  [1                          ▼] │
│                                 │
│  On Item Error                  │
│  [Skip Item              ▼]    │
│                                 │
│  [Test Step]  [Delete Node]     │
└─────────────────────────────────┘
```

**Wait Node Settings Tab:**

```
┌─────────────────────────────────┐
│  ⏸ Wait — Pause Execution    X  │
│  [Settings] [Input] [Output]    │
│                                 │
│  Wait Mode                      │
│  [Fixed Duration           ▼]   │
│                                 │
│  Duration                       │
│  [30       ] [seconds       ▼]  │
│                                 │
│  Max Wait Time                  │
│  24 hours (default)             │
│                                 │
│  [Test Step]  [Delete Node]     │
└─────────────────────────────────┘
```

**Merge Node Settings Tab:**

```
┌─────────────────────────────────┐
│  ⤵ Merge — Combine Branches  X  │
│  [Settings] [Input] [Output]    │
│                                 │
│  Merge Mode                     │
│  [Choose Branch            ▼]   │
│  Pass through whichever         │
│  branch actually executed       │
│                                 │
│  Wait for All Branches          │
│  [● On]                        │
│                                 │
│  [Test Step]  [Delete Node]     │
└─────────────────────────────────┘
```

#### 5.2.5 Variable Picker

Popup showing available data from previous steps, grouped by step.

**Inside a Loop body, the picker shows additional context:**

```
┌────────────────────────────────────┐
│  Select a variable to insert       │
│  ┌──────────────────────────────┐  │
│  │ 🔍 Filter fields...          │  │
│  └──────────────────────────────┘  │
│                                    │
│  Current Loop Item                 │  ← Special section for loop context
│  ┌──────────────────────────────┐  │
│  │ $item          (current item)│  │
│  │ $index         (iteration #) │  │
│  └──────────────────────────────┘  │
│                                    │
│  Step 1 — Telegram                 │
│  ┌──────────────────────────────┐  │
│  │ text           "Beli HP 45rb"│  │
│  │ from.firstName "John"        │  │
│  │ chat.id        "-10012345"   │  │
│  └──────────────────────────────┘  │
│                                    │
│  Step 3 — Merge Output             │
│  ┌──────────────────────────────┐  │
│  │ items[0]       {...}         │  │
│  │ items[1]       {...}         │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Inside a Merge node config, the picker shows branch-specific context:**

```
│  Branch Outputs                    │
│  ┌──────────────────────────────┐  │
│  │ $branches.true.json.xxx     │   │
│  │ $branches.false.json.yyy    │   │
│  └──────────────────────────────┘  │
```

---

### 5.3 Execution Monitor (`/executions/:id`)

**Layout:** Same app shell. Center: vertical step list (read-only, with branch/loop visualization). Right: detail panel.

#### 5.3.1 Top Bar

| Element | Value |
|---------|-------|
| Title | "Execution #[short-id]" |
| Status badge | Success / Failed / Running / Cancelled / Waiting |
| Duration | "Completed in 2.4s" (excludes wait time, or shows "2.4s + 30s wait") |
| Timestamp | "Feb 16, 2026 3:42 PM" |
| Re-run button | Re-executes with same trigger data |

#### 5.3.2 Execution Step List

Same structured layout as the editor, but cards show execution status. Branches show which path was taken.

**Execution Node Card States:**

| State | Appearance |
|-------|------------|
| Success | Green border (3px), checkmark, duration |
| Failed | Red border (3px), X mark, error text, `#fff5f5` bg |
| Running | Blue border (3px), spinner, pulsing |
| Skipped | Gray border (1px), gray bg, "Skipped" label |
| Pending | Default border, no indicator |
| Waiting | Amber border (3px), clock icon, countdown timer |

**Branch Execution Visualization:**

```
┌──────────────────────────────────┐
│  🔀 2. IF — Check Message  ✓ 12ms│  ← Green (evaluated successfully)
│  Condition: TRUE                  │  ← Shows evaluation result
└──────────────────────────────────┘
         |
┌──────────────────────────────────┐
│  ┌─ ✓ True (ACTIVE)┐ ┌─ ✗ False┐│
│  │ ┌──────────────┐│ │ ┌──────┐││  ← True branch green, false grayed
│  │ │2a. Send  ✓   ││ │ │ Skip ││ │
│  │ │ 45ms         ││ │ │ ──── │││
│  │ └──────────────┘│ │ └──────┘││
│  └─────────────────┘ └─────────┘│
└──────────────────────────────────┘
```

**Loop Execution Visualization:**

```
┌──────────────────────────────────┐
│  🔄 4. Loop  ✓  3/3 items  1.2s │  ← Shows progress and total time
└──────────────────────────────────┘
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Iteration: [◀ 1 of 3 ▶]        │  ← Iteration browser
│                                  │
│  ┌──────────────────────────┐    │
│  │ 4.1 HTTP Request  ✓ 380ms│    │  ← Shows data for selected iteration
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 4.2 Wait  ✓  2000ms      │    │
│  └──────────────────────────┘    │
│                                  │
│  Summary: 3 ✓, 0 ✗              │  ← Iteration summary
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Wait Execution Visualization (during wait):**

```
┌──────────────────────────────────┐
│  ⏸ 5. Wait — Rate Limit         │  ← Amber border (waiting)
│  ⏱ Waiting... 18s remaining      │  ← Live countdown
│  Resumes at 3:42:30 PM           │
└──────────────────────────────────┘
```

**Live Updates (WebSocket):**

During a running execution, the existing events apply plus:
- `loop:iteration` → Update iteration counter on loop container, show per-iteration progress
- `wait:started` → Card transitions to "Waiting" state with countdown timer
- `wait:resumed` → Card transitions to "Success", execution continues
- `node:finished` with `branchPath` → Only the active branch highlights; skipped branch grays out

#### 5.3.3 Detail Panel

When clicking any executed step, the right panel shows JSON/Table data.

**For Loop nodes:** Shows the iteration browser at the top. User can select an iteration to view that iteration's input/output data.

**Iteration Browser (`iteration-browser.tsx`):**

```
┌────────────────────────────────────┐
│  Loop Iterations                    │
│  ┌──────────────────────────────┐  │
│  │ ◀  Iteration 2 of 15   ▶    │  │
│  └──────────────────────────────┘  │
│                                    │
│  Status: ✓ Success (380ms)         │
│                                    │
│  Input ($item):                    │
│  { "name": "Product B", ... }      │
│                                    │
│  Output:                           │
│  { "statusCode": 200, ... }        │
│                                    │
│  ─── All Iterations ───            │
│  #1  ✓  320ms                      │
│  #2  ✓  380ms  ← viewing           │
│  #3  ✗  Error: timeout             │
│  #4  ⊘  Skipped (after error)      │
│  ...                               │
└────────────────────────────────────┘
```

**For Wait nodes:** Shows wait duration and resume trigger info.

**For Merge nodes:** Shows which branches contributed data and the merged result.

#### 5.3.4 Timeline Bar

Below the step list. Each segment colored per step. Loop nodes show as a single aggregated segment. Wait nodes show a distinct "pause" segment in amber.

```
|████|████████████████████|▓▓▓▓▓▓|██████████|█████|
 0.1s       1.2s           30s     0.6s     0.5s
 Tele..     Loop (3 items) Wait    Code     Sheets
```

---

### 5.4 Execution History (`/workflows/:id/executions` or `/dashboard/history`)

**Layout:** Full-width table with filters.

**Filters:** Status, Workflow, Date range (same as before).

**Table Columns:** Status, Workflow, Mode, Started, Duration, Actions.

**Additional column for branching workflows:** "Path" column showing which branches were taken (e.g., "IF→True", "Loop×15").

**Expandable Row:** Clicking a failed row shows error message, failed step, fix suggestion.

---

### 5.5 Credentials (`/credentials`)

Same as original spec. No changes needed for branching/loop/wait/merge features.

---

## 6. Component Interaction Patterns

### 6.1 Creating a Branching Workflow

```
1. User creates workflow, configures trigger
2. User clicks "+" to add a step
3. Node Picker opens → Tools & Logic → IF
4. IF node appears with branch container below (true/false placeholders)
5. A Merge node is auto-inserted below the branch container
6. User clicks [+] inside the True branch
7. Node Picker opens (context: inside true branch)
8. User selects Telegram → Send Message
9. Node appears inside true branch container
10. User clicks [+] inside the False branch
11. User selects Google Sheets → Append Row
12. Node appears inside false branch container
13. User configures the IF condition, branch nodes, and Merge mode
14. User clicks Test Run → sees execution flow through one branch
```

### 6.2 Creating a Loop Workflow

```
1. User has a trigger that produces an array (e.g., Google Sheets Read Rows)
2. User clicks "+" and selects Flow Control → Loop → For Each Item
3. Loop node appears with loop body container below (empty placeholder)
4. User configures Loop source: {{ $steps[1].json.rows }}
5. User clicks [+] inside the loop body
6. Adds HTTP Request node (uses $item to reference current row)
7. User clicks [+] inside loop body again
8. Adds Wait node (2 seconds between API calls for rate limiting)
9. User clicks Test Run → sees loop iterate through items
10. Execution monitor shows iteration browser: 1 of 15, 2 of 15, etc.
```

### 6.3 Using a Wait Node

```
1. User places a Wait node between two action steps
2. Configures: Duration = 5 minutes
3. Test Run begins
4. Steps 1-3 execute normally
5. Step 4 (Wait) enters "Waiting" state
6. Execution status changes to "waiting"
7. Execution monitor shows countdown: "4:32 remaining"
8. After 5 minutes, Wait node resolves
9. Steps 5+ continue executing
10. Total duration shown as "execution time + wait time"
```

### 6.4 Execution Flow with Branches (WebSocket)

```
1. User clicks "Test Run" → POST /api/workflows/:id/execute
2. WS: execution:started
3. WS: node:started (trigger)
4. WS: node:finished (trigger, success)
5. WS: node:started (IF node)
6. WS: node:finished (IF node, success, output: { conditionResult: true })
7. WS: node:started (true branch node, branchPath: "true")
8. WS: node:finished (true branch node, success, branchPath: "true")
   → True branch highlights green, false branch grays out
9. WS: node:started (merge node)
10. WS: node:finished (merge node, success)
11. WS: execution:finished (success)
```

### 6.5 Error Handling Flow

Same as original spec, plus:
- Loop errors show which iteration failed with "Item 3 of 15 failed"
- Branch errors show which branch path the error occurred on
- Wait timeout errors show "Wait exceeded maximum duration of 24 hours"

---

## 7. Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| ≥ 1280px | Full layout: sidebar + canvas + config panel side by side. Branch columns side-by-side. |
| 1024–1279px | Sidebar collapses to icons. Config panel overlays canvas. Branch columns stack vertically with labels. |
| 768–1023px | Sidebar hidden. Config panel full-width overlay. Branches always stacked. |
| < 768px | Not supported in MVP. Show "best viewed on desktop" message. |

---

## 8. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All elements focusable via Tab, including branch and loop body nodes. |
| Focus trapping | Modals trap focus. Branch/loop containers are navigable with arrow keys. |
| Screen reader labels | Branch containers: "True branch with N steps", "False branch with N steps". Loop: "Loop body with N steps, iterates over [source]". |
| Color contrast | All text meets WCAG 2.1 AA. Branch labels not color-only (include ✓/✗ icons). |
| Status announcements | Execution status, loop progress, and wait countdowns announced via aria-live. |
| Reduced motion | Respect `prefers-reduced-motion`. Disable animations. |
| Form validation | Inline errors via aria-describedby. |

---

## 9. Error Message Standards

Same format as original spec. Additional error examples for new node types:

| Error | User Message | Fix Suggestion |
|-------|-------------|----------------|
| Loop source not an array | "The Loop in Step 4 expected a list of items, but received a single value instead." | "Check that the source expression points to an array field. You may need to wrap the value in brackets." |
| Loop iteration limit | "The Loop in Step 4 stopped after 1,000 items to prevent overload." | "If you need to process more items, consider filtering the data first or breaking it into batches." |
| Loop item error (skipItem mode) | "3 of 50 items failed in the Loop at Step 4. 47 items were processed successfully." | "Click the Loop step to browse individual iteration results and see which items failed." |
| Wait timeout exceeded | "The Wait at Step 5 expired after 24 hours without resuming." | "Check your external system to ensure it can send the resume webhook. Consider using a shorter wait time." |
| Merge missing branch | "The Merge at Step 6 expected input from both branches, but the True branch didn't execute." | "If one branch may not run, set the Merge mode to 'Choose Branch' instead of 'Append'." |
| Nesting depth exceeded | "You can't add another IF or Loop here — the maximum nesting depth of 3 levels has been reached." | "Simplify your workflow by extracting nested logic into a separate workflow, or flatten the structure." |

---

## 10. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.0s | Lighthouse |
| Largest Contentful Paint | < 2.0s | Lighthouse |
| Time to Interactive | < 2.5s | Lighthouse |
| Bundle size (initial) | < 200KB gzipped | Vite build stats |
| Workflow editor load | < 500ms after navigation | Performance.mark |
| Node picker modal open | < 100ms | Perceived responsiveness |
| Config panel slide | 200ms CSS transition | CSS |
| Branch container render | < 200ms for 3 nesting levels | Performance.mark |
| Loop iteration browser | < 100ms to switch iterations | Perceived responsiveness |
| WebSocket reconnect | < 3 seconds | Automatic with exponential backoff |

### 10.1 Optimization Strategies

- **Code splitting**: Each route is lazy-loaded (`React.lazy`)
- **Node type definitions**: Loaded once and cached via TanStack Query (`staleTime: Infinity`)
- **Execution data**: Only the currently viewed execution's full data is loaded; the list shows summaries
- **Loop iteration data**: Loaded lazily per iteration when the user browses to it (not all iterations upfront)
- **Debounced saves**: Auto-save debounced to 2 seconds after last change
- **Virtual scrolling**: If execution history exceeds 100 rows, use `@tanstack/react-virtual`
- **Image optimization**: App icons served as optimized SVGs or small PNGs
- **Branch/loop collapse**: Collapsed containers don't render their child components
