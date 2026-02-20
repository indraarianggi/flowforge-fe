// src/components/workflow/configs/LoopConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ExpressionField } from "../ExpressionField"
import type { LoopConfig as Config } from "@/types"
import type { WorkflowNode, WorkflowEdge } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentNodeId: string
}

export function LoopConfig({ config, onChange, nodes, edges, currentNodeId }: Props) {
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
          edges={edges}
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
