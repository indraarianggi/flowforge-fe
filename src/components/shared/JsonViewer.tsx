// src/components/shared/JsonViewer.tsx
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  data: unknown
  defaultExpanded?: boolean
  maxHeight?: string
}

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1)

  if (value === null) return <span className="text-slate-400 italic">null</span>
  if (typeof value === "boolean")
    return (
      <span className={cn("font-semibold", value ? "text-emerald-400" : "text-rose-400")}>
        {String(value)}
      </span>
    )
  if (typeof value === "number")
    return <span className="text-violet-400 tabular-nums">{value}</span>
  if (typeof value === "string")
    return (
      <span className="text-amber-300">
        <span className="text-amber-500/70">&quot;</span>
        {value}
        <span className="text-amber-500/70">&quot;</span>
      </span>
    )

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-slate-500">[ ]</span>
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors rounded px-0.5 hover:bg-white/5"
        >
          {collapsed ? (
            <ChevronRight size={10} className="opacity-70" />
          ) : (
            <ChevronDown size={10} className="opacity-70" />
          )}
          <span className="text-slate-500 text-[10px]">
            [{value.length}]
          </span>
        </button>
        {!collapsed && (
          <div className="ml-3 border-l border-slate-700/60 pl-3 mt-0.5">
            {value.map((item, idx) => (
              <div key={idx} className="my-0.5 leading-5">
                <span className="text-slate-600 select-none text-[10px] mr-1.5">{idx}</span>
                <JsonNode value={item} depth={depth + 1} />
                {idx < value.length - 1 && (
                  <span className="text-slate-700">,</span>
                )}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0)
      return <span className="text-slate-500">{ }</span>
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-200 transition-colors rounded px-0.5 hover:bg-white/5"
        >
          {collapsed ? (
            <ChevronRight size={10} className="opacity-70" />
          ) : (
            <ChevronDown size={10} className="opacity-70" />
          )}
          <span className="text-slate-500 text-[10px]">
            {"{"}
            {entries.length}
            {"}"}
          </span>
        </button>
        {!collapsed && (
          <div className="ml-3 border-l border-slate-700/60 pl-3 mt-0.5">
            {entries.map(([key, val], idx) => (
              <div key={key} className="my-0.5 leading-5">
                <span className="text-sky-400/90">&quot;{key}&quot;</span>
                <span className="text-slate-600 mx-1">:</span>
                <JsonNode value={val} depth={depth + 1} />
                {idx < entries.length - 1 && (
                  <span className="text-slate-700">,</span>
                )}
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }

  return <span className="text-slate-300">{String(value)}</span>
}

export function JsonViewer({ data, maxHeight = "200px" }: Props) {
  return (
    <div
      className="bg-[#0d1117] rounded-lg p-3.5 overflow-auto font-mono text-xs leading-relaxed border border-slate-800/80 shadow-inner"
      style={{ maxHeight }}
    >
      <JsonNode value={data} depth={0} />
    </div>
  )
}
