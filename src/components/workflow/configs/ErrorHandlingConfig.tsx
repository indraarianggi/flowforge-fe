// src/components/workflow/configs/ErrorHandlingConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ErrorHandlingSettings {
  mode: "stop" | "continue" | "retry"
  retryCount?: number
  retryDelayMs?: number
}

interface Props {
  settings: ErrorHandlingSettings
  onChange: (settings: ErrorHandlingSettings) => void
}

const MODES = [
  { value: "stop",     label: "Stop workflow",  desc: "Halt execution on error (default)" },
  { value: "continue", label: "Continue",        desc: "Log error, continue to next step" },
  { value: "retry",    label: "Retry",           desc: "Re-attempt this step N times" },
]

export function ErrorHandlingConfig({ settings, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-slate-600">On error</Label>
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onChange({ ...settings, mode: m.value as ErrorHandlingSettings["mode"] })}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
              settings.mode === m.value
                ? "border-primary bg-blue-50"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0",
              settings.mode === m.value ? "border-primary bg-primary" : "border-slate-300"
            )} />
            <div>
              <p className="text-sm font-medium text-slate-800">{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {settings.mode === "retry" && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Max retries</Label>
            <Input
              type="number"
              value={settings.retryCount ?? 3}
              onChange={(e) => onChange({ ...settings, retryCount: Number(e.target.value) })}
              min={1}
              max={10}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Retry delay (ms)</Label>
            <Input
              type="number"
              value={settings.retryDelayMs ?? 1000}
              onChange={(e) => onChange({ ...settings, retryDelayMs: Number(e.target.value) })}
              min={100}
              max={60000}
              step={100}
              className="text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
