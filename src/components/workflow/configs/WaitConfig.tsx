// src/components/workflow/configs/WaitConfig.tsx
import { Copy } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { WaitConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function WaitConfig({ config, onChange }: Props) {
  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Wait mode</Label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["duration", "webhookResume"] as const).map((mode) => (
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
              {mode === "duration" ? "Fixed duration" : "Webhook resume"}
            </button>
          ))}
        </div>
      </div>

      {config.mode === "duration" && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Wait for</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={config.durationValue ?? 5}
              onChange={(e) => onChange({ ...config, durationValue: Number(e.target.value) })}
              min={1}
              className="text-sm w-24"
            />
            <Select
              value={config.durationUnit ?? "minutes"}
              onValueChange={(v) => onChange({ ...config, durationUnit: v as Config["durationUnit"] })}
            >
              <SelectTrigger className="text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {config.mode === "webhookResume" && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">Coming soon (P1 feature)</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Webhook resume pauses the execution until an external HTTP call resumes it.
              This feature is planned for a future release.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Resume webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value="https://app.flowforge.dev/webhook/resume/..."
                readOnly
                className="font-mono text-xs bg-slate-50 text-slate-400"
              />
              <Copy size={14} className="text-slate-300 flex-shrink-0" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Max wait time (hours)</Label>
        <Input
          type="number"
          value={config.maxWaitHours ?? 24}
          onChange={(e) => onChange({ ...config, maxWaitHours: Number(e.target.value) })}
          min={1}
          max={24}
          className="text-sm"
        />
        <p className="text-xs text-slate-400">Maximum 24 hours. Executions waiting longer are auto-cancelled.</p>
      </div>
    </div>
  )
}
