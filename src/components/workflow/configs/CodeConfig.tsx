// src/components/workflow/configs/CodeConfig.tsx
import CodeMirror from "@uiw/react-codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { oneDark } from "@codemirror/theme-one-dark"
import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { CodeConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function CodeConfig({ config, onChange }: Props) {
  function addMapping() {
    onChange({
      ...config,
      inputMappings: [...config.inputMappings, { name: "", expression: "" }],
    })
  }

  function removeMapping(idx: number) {
    onChange({
      ...config,
      inputMappings: config.inputMappings.filter((_, i) => i !== idx),
    })
  }

  function updateMapping(idx: number, key: "name" | "expression", val: string) {
    onChange({
      ...config,
      inputMappings: config.inputMappings.map((m, i) => (i === idx ? { ...m, [key]: val } : m)),
    })
  }

  return (
    <div className="space-y-4">
      {/* Context hint */}
      <div className="p-3 bg-slate-900 rounded-lg">
        <p className="text-xs font-semibold text-slate-400 mb-1.5">Available variables</p>
        {[
          { name: "$input",  desc: "Input data from previous step" },
          { name: "$steps",  desc: "All previous step outputs" },
          { name: "$item",   desc: "Current loop item (in loops)" },
          { name: "$index",  desc: "Current loop index (in loops)" },
        ].map(({ name, desc }) => (
          <div key={name} className="flex items-center gap-2 py-0.5">
            <span className="text-xs font-mono text-blue-400 w-20">{name}</span>
            <span className="text-xs text-slate-500">{desc}</span>
          </div>
        ))}
      </div>

      {/* Input mappings */}
      {config.inputMappings.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-600">Input mappings</Label>
          {config.inputMappings.map((m, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={m.name}
                onChange={(e) => updateMapping(idx, "name", e.target.value)}
                placeholder="Variable name"
                className="text-xs font-mono w-32"
              />
              <Input
                value={m.expression}
                onChange={(e) => updateMapping(idx, "expression", e.target.value)}
                placeholder="{{ $steps[1].json.field }}"
                className="text-xs font-mono flex-1"
              />
              <button onClick={() => removeMapping(idx)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="text-xs" onClick={addMapping}>
        <Plus size={12} className="mr-1.5" /> Add input mapping
      </Button>

      {/* Code editor */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">JavaScript code</Label>
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <CodeMirror
            value={config.code}
            height="220px"
            theme={oneDark}
            extensions={[javascript()]}
            onChange={(code) => onChange({ ...config, code })}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              autocompletion: true,
            }}
          />
        </div>
        <p className="text-xs text-slate-400">
          Return a value from your code. It becomes this step's output data.
        </p>
      </div>
    </div>
  )
}
