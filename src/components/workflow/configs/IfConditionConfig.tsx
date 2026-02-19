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

export function IfConditionConfig({ config, onChange }: Props) {
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
