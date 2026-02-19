// src/components/workflow/configs/ScheduleTriggerConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ScheduleTriggerConfig as Config } from "@/types"

const PRESETS = [
  { value: "every_5m", label: "Every 5 minutes",        cron: "*/5 * * * *" },
  { value: "hourly",   label: "Every hour",             cron: "0 * * * *" },
  { value: "daily",    label: "Every day at 9:00 AM",   cron: "0 9 * * *" },
  { value: "weekly",   label: "Every Monday at 9:00 AM",cron: "0 9 * * 1" },
  { value: "monthly",  label: "1st of every month",     cron: "0 9 1 * *" },
  { value: "custom",   label: "Custom cron expression", cron: "" },
]

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Tokyo", "Asia/Singapore", "Asia/Jakarta", "Asia/Kolkata",
  "Australia/Sydney",
]

function humanReadable(cron: string): string {
  const found = PRESETS.find((p) => p.cron === cron)
  return found ? found.label : `Cron: ${cron}`
}

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function ScheduleTriggerConfig({ config, onChange }: Props) {
  const isCustom = config.preset === "custom"

  function handlePresetChange(value: string) {
    const preset = PRESETS.find((p) => p.value === value)!
    onChange({ ...config, preset: value as Config["preset"], cron: preset.cron })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Schedule</Label>
        <Select value={config.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Cron expression</Label>
          <Input
            value={config.cron ?? ""}
            onChange={(e) => onChange({ ...config, cron: e.target.value })}
            placeholder="0 9 * * *"
            className="font-mono text-sm"
          />
          {config.cron && (
            <p className="text-xs text-slate-500">{humanReadable(config.cron)}</p>
          )}
        </div>
      )}

      {!isCustom && config.cron && (
        <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 font-medium">{humanReadable(config.cron)}</p>
          <p className="text-xs text-blue-500 font-mono mt-0.5">{config.cron}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Timezone</Label>
        <Select
          value={config.timezone}
          onValueChange={(v) => onChange({ ...config, timezone: v })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
