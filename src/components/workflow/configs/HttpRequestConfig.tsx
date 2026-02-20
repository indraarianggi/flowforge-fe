// src/components/workflow/configs/HttpRequestConfig.tsx
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { KeyValueEditor } from "../KeyValueEditor"
import { ExpressionField } from "../ExpressionField"
import type { HttpRequestConfig as Config } from "@/types"
import type { WorkflowNode, WorkflowEdge } from "@/types"

interface Props {
  config: Config
  onChange: (config: Config) => void
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  currentNodeId: string
}

export function HttpRequestConfig({ config, onChange, nodes, edges, currentNodeId }: Props) {
  const fieldProps = { nodes, edges, currentNodeId }

  return (
    <div className="space-y-4">
      {/* URL */}
      <ExpressionField
        label="URL"
        value={config.url}
        onChange={(url) => onChange({ ...config, url })}
        placeholder="https://api.example.com/endpoint"
        {...fieldProps}
      />

      {/* Method */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Method</Label>
        <Select value={config.method} onValueChange={(v) => onChange({ ...config, method: v as Config["method"] })}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["GET","POST","PUT","DELETE","PATCH"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body / Headers / Params / Auth tabs */}
      <Tabs defaultValue="body">
        <TabsList className="w-full">
          <TabsTrigger value="body" className="flex-1 text-xs">Body</TabsTrigger>
          <TabsTrigger value="headers" className="flex-1 text-xs">Headers</TabsTrigger>
          <TabsTrigger value="params" className="flex-1 text-xs">Params</TabsTrigger>
          <TabsTrigger value="auth" className="flex-1 text-xs">Auth</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="space-y-2 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Body type</Label>
            <Select value={config.bodyType} onValueChange={(v) => onChange({ ...config, bodyType: v as Config["bodyType"] })}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form">Form data</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {config.method !== "GET" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Body</Label>
              <Textarea
                value={config.body ?? ""}
                onChange={(e) => onChange({ ...config, body: e.target.value })}
                placeholder={config.bodyType === "json" ? '{\n  "key": "value"\n}' : "key=value"}
                className="font-mono text-xs min-h-28 resize-y"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="headers" className="mt-3">
          <KeyValueEditor
            label="Headers"
            rows={config.headers}
            onChange={(headers) => onChange({ ...config, headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Value"
          />
        </TabsContent>

        <TabsContent value="params" className="mt-3">
          <KeyValueEditor
            label="Query parameters"
            rows={config.queryParams}
            onChange={(queryParams) => onChange({ ...config, queryParams })}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Value"
          />
        </TabsContent>

        <TabsContent value="auth" className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Authentication</Label>
            <Select
              value={config.authType}
              onValueChange={(v) => onChange({ ...config, authType: v as Config["authType"], authConfig: {} })}
            >
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer token</SelectItem>
                <SelectItem value="basic">Basic (username / password)</SelectItem>
                <SelectItem value="api_key">API key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.authType === "bearer" && (
            <Input
              value={config.authConfig?.token ?? ""}
              onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, token: e.target.value } })}
              placeholder="Bearer token"
              type="password"
              className="text-sm font-mono"
            />
          )}

          {config.authType === "basic" && (
            <div className="space-y-2">
              <Input
                value={config.authConfig?.username ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, username: e.target.value } })}
                placeholder="Username"
                className="text-sm"
              />
              <Input
                value={config.authConfig?.password ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, password: e.target.value } })}
                placeholder="Password"
                type="password"
                className="text-sm"
              />
            </div>
          )}

          {config.authType === "api_key" && (
            <div className="space-y-2">
              <Input
                value={config.authConfig?.keyName ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, keyName: e.target.value } })}
                placeholder="Key name (e.g. X-API-Key)"
                className="text-sm"
              />
              <Input
                value={config.authConfig?.keyValue ?? ""}
                onChange={(e) => onChange({ ...config, authConfig: { ...config.authConfig, keyValue: e.target.value } })}
                placeholder="Key value"
                type="password"
                className="text-sm font-mono"
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Send in</Label>
                <Select
                  value={config.authConfig?.placement ?? "header"}
                  onValueChange={(v) => onChange({ ...config, authConfig: { ...config.authConfig, placement: v } })}
                >
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="query">Query parameter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeout */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Timeout (ms)</Label>
        <Input
          type="number"
          value={config.timeout}
          onChange={(e) => onChange({ ...config, timeout: Number(e.target.value) })}
          min={100}
          max={60000}
          className="text-sm"
        />
      </div>
    </div>
  )
}
