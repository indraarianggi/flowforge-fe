// src/components/workflow/ExpressionField.tsx
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { VariablePicker } from "./VariablePicker"
import type { WorkflowNode, WorkflowEdge } from "@/types"

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentNodeId: string
}

export function ExpressionField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  nodes,
  edges,
  currentNodeId,
}: Props) {
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  function handleInsert(expression: string) {
    const el = inputRef.current
    if (!el) {
      onChange(value + expression)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const newValue = value.slice(0, start) + expression + value.slice(end)
    onChange(newValue)
    // Restore cursor position after state update
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + expression.length, start + expression.length)
    }, 0)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <VariablePicker
          nodes={nodes}
          edges={edges}
          currentNodeId={currentNodeId}
          onInsert={handleInsert}
        />
      </div>
      {multiline ? (
        <Textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs min-h-20 resize-y"
        />
      ) : (
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  )
}
