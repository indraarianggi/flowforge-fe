# For Loop Example Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `wf-004` to the seed workflows — a "Weekly Sales Report" workflow that demonstrates the full loop node lifecycle: `loopBody` (per-item processing) and `loopComplete` (post-loop action).

**Architecture:** Add a new entry to the `seedWorkflows` array in `src/mocks/workflows.ts`. The workflow uses a `schedule_trigger → google_sheets_read → loop (forEach) → [http_request via loopBody] → telegram_send_message via loopComplete` chain. No new types, stores, or components required — this is purely seed data.

**Tech Stack:** TypeScript, existing `Workflow` / `WorkflowNode` / `WorkflowEdge` types from `src/types/workflow.ts`.

---

## Context

### Existing loop workflow (wf-003)
`wf-003: Bulk Email Sender` already uses a `loop` node with `forEach` mode, but:
- Only connects `loopBody` — the `loopComplete` handle is left dangling.
- Does not show what happens *after* all iterations finish.

### What wf-004 adds
| Handle | Connected to | Demonstrates |
|---|---|---|
| `loopBody` | `http_request` (Fetch Rep Metrics) | Per-item processing |
| `loopComplete` | `telegram_send_message` (Send Summary) | Post-loop action |

### Node ID ranges
Following the established convention:
- Nodes: `n-030` … `n-034`
- Edges: `e-030` … `e-033`

---

## Task 1: Add wf-004 to seedWorkflows

**Files:**
- Modify: `src/mocks/workflows.ts`

### Step 1: Open the file and locate the insertion point

The new workflow goes **before** `wf-003` (comment: `// Workflow 3: Loop`), keeping workflows ordered by complexity (simple → branching → loop-complete → loop-body-only).

### Step 2: Insert the workflow object

Add the following entry **before** the `// Workflow 3` comment block:

```ts
// Workflow 4: For Loop with loopComplete — schedule_trigger → google_sheets_read → loop → [http_request body] → telegram_send_message (after loop)
{
  id: 'wf-004',
  userId: 'user-001',
  name: 'Weekly Sales Report',
  description: 'Loop through each sales rep, fetch their metrics, then send a Telegram summary once all reps are processed',
  isActive: true,
  nodes: [
    {
      id: 'n-030',
      type: 'schedule_trigger',
      label: 'Every Monday 8am',
      category: 'trigger',
      status: 'configured',
      config: { preset: 'weekly', cron: '0 8 * * 1', timezone: 'Asia/Jakarta' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'n-031',
      type: 'google_sheets_read',
      label: 'Read Sales Rep List',
      category: 'integration',
      status: 'configured',
      credentialId: 'cred-002',
      config: {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
        sheetName: 'SalesReps',
        range: 'A2:C',
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'n-032',
      type: 'loop',
      label: 'For Each Sales Rep',
      category: 'flow_control',
      status: 'configured',
      config: {
        mode: 'forEach',
        source: '{{ $prev.json.rows }}',
        batchSize: 1,
        onItemError: 'skipItem',
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'n-033',
      type: 'http_request',
      label: 'Fetch Rep Metrics',
      category: 'action',
      status: 'configured',
      parentId: 'n-032',
      branchType: 'body',
      config: {
        url: 'https://api.sales.example.com/metrics/{{ $item.repId }}',
        method: 'GET',
        headers: [{ key: 'Authorization', value: 'Bearer {{ $env.SALES_API_KEY }}' }],
        queryParams: [{ key: 'week', value: '{{ $runDate }}' }],
        bodyType: 'json',
        authType: 'none',
        timeout: 8000,
      },
      position: { x: 0, y: 0 },
    },
    {
      id: 'n-034',
      type: 'telegram_send_message',
      label: 'Send Weekly Summary',
      category: 'integration',
      status: 'configured',
      credentialId: 'cred-001',
      config: {},
      position: { x: 0, y: 0 },
    },
  ],
  edges: [
    { id: 'e-030', source: 'n-030', target: 'n-031' },
    { id: 'e-031', source: 'n-031', target: 'n-032' },
    {
      id: 'e-032',
      source: 'n-032',
      target: 'n-033',
      sourceHandle: 'loopBody',
      type: 'loop',
      label: 'Loop Body',
    },
    {
      id: 'e-033',
      source: 'n-032',
      target: 'n-034',
      sourceHandle: 'loopComplete',
      type: 'loop',
      label: 'Loop Complete',
    },
  ],
  settings: { maxLoopIterations: 500 },
  lastRunAt: '2026-02-17T08:00:00.000Z',
  createdAt: '2026-02-01T09:00:00.000Z',
  updatedAt: '2026-02-17T08:00:00.000Z',
},
```

### Step 3: Verify TypeScript compiles with no errors

```bash
pnpm tsc --noEmit
```

Expected: no errors.

### Step 4: Commit

```bash
git add src/mocks/workflows.ts
git commit -m "feat: add wf-004 Weekly Sales Report — for-loop example with loopBody + loopComplete"
```

---

## Checklist

- [ ] `wf-004` entry added before `wf-003` in `seedWorkflows`
- [ ] All 5 nodes present: `n-030` … `n-034`
- [ ] All 4 edges present: `e-030` … `e-033`
- [ ] `loopBody` edge (`e-032`) connects `n-032 → n-033`
- [ ] `loopComplete` edge (`e-033`) connects `n-032 → n-034`
- [ ] `pnpm tsc --noEmit` passes cleanly
- [ ] Committed
