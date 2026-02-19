// src/components/workflow/configs/WebhookTriggerConfig.tsx
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WebhookTriggerConfig as Config } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
}

export function WebhookTriggerConfig({ config, onChange }: Props) {
  const [copied, setCopied] = useState(false)
  const webhookUrl = `https://app.flowforge.dev/webhook/${config.path}`

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Webhook URL</Label>
        <div className="flex items-center gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs bg-slate-50" />
          <button onClick={copyUrl} className="text-slate-400 hover:text-primary flex-shrink-0 transition-colors">
            {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
          </button>
        </div>
        <p className="text-xs text-slate-400">Send HTTP requests to this URL to trigger the workflow.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">HTTP method</Label>
        <Select
          value={config.method}
          onValueChange={(v) => onChange({ ...config, method: v as Config["method"] })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="ANY">Any method</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Response mode</Label>
        <Select
          value={config.responseMode}
          onValueChange={(v) => onChange({ ...config, responseMode: v as Config["responseMode"] })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediately">Respond immediately (202 Accepted)</SelectItem>
            <SelectItem value="after_workflow">Respond after workflow completes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
