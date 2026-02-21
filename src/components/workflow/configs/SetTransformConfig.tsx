// src/components/workflow/configs/SetTransformConfig.tsx
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExpressionField } from "../ExpressionField"
import type { SetTransformConfig as Config } from "@/types"
import type { WorkflowNode, WorkflowEdge } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentNodeId: string
}

export function SetTransformConfig({ config, onChange, nodes, edges, currentNodeId }: Props) {
  function addField() {
    onChange({
      ...config,
      fields: [...config.fields, { id: `f-${Date.now()}`, name: "", value: "" }],
    })
  }

  function removeField(id: string) {
    onChange({ ...config, fields: config.fields.filter((f) => f.id !== id) })
  }

  function updateField(id: string, key: "name" | "value", val: string) {
    onChange({
      ...config,
      fields: config.fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)),
    })
  }

  const preview = config.fields.reduce<Record<string, string>>((acc, f) => {
    if (f.name) acc[f.name] = f.value
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {config.fields.map((field) => (
          <div key={field.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={field.name}
                onChange={(e) => updateField(field.id, "name", e.target.value)}
                placeholder="Field name"
                className="text-xs font-mono"
              />
              <button
                onClick={() => removeField(field.id)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <ExpressionField
              label="Value"
              value={field.value}
              onChange={(val) => updateField(field.id, "value", val)}
              placeholder="Value or {{ expression }}"
              nodes={nodes}
              edges={edges}
              currentNodeId={currentNodeId}
            />
          </div>
        ))}
        {config.fields.length === 0 && (
          <p className="text-xs text-slate-400 py-2">No fields added yet</p>
        )}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addField}>
        <Plus size={12} className="mr-1.5" /> Add field
      </Button>

      {/* Output preview */}
      {Object.keys(preview).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Output preview</p>
          <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto max-h-32">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
