// src/components/workflow/configs/MergeConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { MergeConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function MergeConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Merge strategy</Label>
        <Select
          value={config.strategy}
          onValueChange={(v) => onChange({ ...config, strategy: v as Config["strategy"] })}
        >
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="append">Append outputs (combine into array)</SelectItem>
            <SelectItem value="choose_branch">Choose executing branch only</SelectItem>
            <SelectItem value="combine_by_key">Combine by key field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.strategy === "append" && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            Combines all branch outputs into a single array. Skipped branches produce empty entries.
          </p>
        </div>
      )}

      {config.strategy === "choose_branch" && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            Passes through only the output of the branch that actually executed. Useful after IF nodes where only one branch runs.
          </p>
        </div>
      )}

      {config.strategy === "combine_by_key" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Key field</Label>
          <Input
            value={config.keyField ?? ""}
            onChange={(e) => onChange({ ...config, keyField: e.target.value })}
            placeholder="id"
            className="text-sm font-mono"
          />
          <p className="text-xs text-slate-400">
            Merges objects from each branch by matching on this field name.
          </p>
        </div>
      )}
    </div>
  )
}
