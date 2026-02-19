// src/components/workflow/KeyValueEditor.tsx
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Row {
  key: string
  value: string
}

interface Props {
  label: string
  rows: Row[]
  onChange: (rows: Row[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export function KeyValueEditor({ label, rows, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value" }: Props) {
  function add() {
    onChange([...rows, { key: "", value: "" }])
  }

  function remove(idx: number) {
    onChange(rows.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: "key" | "value", val: string) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={add}>
          <Plus size={11} /> Add row
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="text-xs text-slate-400 py-2">No {label.toLowerCase()} added</p>
      )}
      {rows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={row.key}
            onChange={(e) => update(idx, "key", e.target.value)}
            placeholder={keyPlaceholder}
            className="text-xs"
          />
          <Input
            value={row.value}
            onChange={(e) => update(idx, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className="text-xs font-mono"
          />
          <button onClick={() => remove(idx)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
