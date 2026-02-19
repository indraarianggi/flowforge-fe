// src/components/workflow/configs/ManualTriggerConfig.tsx
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ManualTriggerConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function ManualTriggerConfig({ config, onChange }: Props) {
  const sampleJson = config.sampleData ?? ""

  function handleChange(value: string) {
    onChange({ ...config, sampleData: value })
  }

  function handleValidate() {
    try {
      JSON.parse(sampleJson || "{}")
    } catch {
      return false
    }
    return true
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Sample input data (JSON)</Label>
        <p className="text-xs text-slate-400">
          Optional. Define sample data to use when testing this workflow manually.
        </p>
        <Textarea
          value={sampleJson}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={'{\n  "key": "value"\n}'}
          className="font-mono text-xs min-h-32 resize-y"
        />
        {sampleJson && !handleValidate() && (
          <p className="text-xs text-destructive">Invalid JSON</p>
        )}
      </div>
      {sampleJson && handleValidate() && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {}}
        >
          Use this sample for variable picker
        </Button>
      )}
    </div>
  )
}
