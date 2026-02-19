// src/components/workflow/configs/IntegrationPlaceholderConfig.tsx
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Link } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { useCredentials } from "@/hooks/useCredentials"
import type { NodeTypeMeta } from "../nodeTypes"
import type { IntegrationConfig } from "@/types"

interface Props {
  meta: NodeTypeMeta
  config: IntegrationConfig
  onChange: (config: IntegrationConfig) => void
}

export function IntegrationPlaceholderConfig({ meta, config, onChange }: Props) {
  const { data: credentials = [] } = useCredentials()
  const compatibleType = meta.type.includes("telegram") ? "telegram" : "google"
  const compatibleCreds = credentials.filter((c) => c.type === compatibleType)

  return (
    <div className="space-y-4">
      {/* Credential selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Credential</Label>
        <Select
          value={config.credentialId ?? ""}
          onValueChange={(v) => onChange({ ...config, credentialId: v })}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select a credential..." />
          </SelectTrigger>
          <SelectContent>
            {compatibleCreds.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.status === "expired" && " (expired)"}
              </SelectItem>
            ))}
            {compatibleCreds.length === 0 && (
              <SelectItem value="none" disabled>No credentials found</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Link
          to="/credentials"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink size={11} /> Manage credentials
        </Link>
      </div>

      {/* Placeholder body */}
      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
        <div className="text-2xl mb-2">{meta.icon}</div>
        <p className="text-sm font-semibold text-slate-700 mb-1">{meta.label}</p>
        <p className="text-xs text-slate-400">{meta.description}</p>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 font-medium">
            Full configuration coming in the next release
          </p>
        </div>
      </div>
    </div>
  )
}
