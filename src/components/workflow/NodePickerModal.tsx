// src/components/workflow/NodePickerModal.tsx
import { useState } from "react"
import { Search, ArrowLeft, Zap } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { NODE_TYPE_META, defaultConfig } from "./nodeTypes"
import type { NodeTypeMeta } from "./nodeTypes"
import type { NodeCategory, WorkflowNode } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (node: WorkflowNode) => void
}

const CATEGORIES: { key: NodeCategory | "all"; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "trigger",      label: "Triggers" },
  { key: "action",       label: "Actions" },
  { key: "flow_control", label: "Flow Control" },
  { key: "integration",  label: "Integrations" },
]

export function NodePickerModal({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | "all">("all")
  const [selectedMeta, setSelectedMeta] = useState<NodeTypeMeta | null>(null)

  function reset() {
    setSearch("")
    setCategoryFilter("all")
    setSelectedMeta(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSelectMeta(meta: NodeTypeMeta) {
    setSelectedMeta(meta)
  }

  function handleConfirm() {
    if (!selectedMeta) return
    const node: WorkflowNode = {
      id: `n-${Date.now()}`,
      type: selectedMeta.type,
      label: selectedMeta.label,
      category: selectedMeta.category,
      status: 'unconfigured',
      config: defaultConfig[selectedMeta.type] ?? {},
      position: { x: 0, y: 0 },
    }
    onSelect(node)
    handleClose()
  }

  const filtered = NODE_TYPE_META.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Step 1: Choose App/Type */}
        {!selectedMeta && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
              <DialogTitle className="text-base font-semibold text-slate-800">Add a step</DialogTitle>
              <div className="relative mt-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search steps..."
                  className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/30"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              {/* Category tabs */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key as NodeCategory | "all")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150",
                      categoryFilter === cat.key
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-2 gap-2">
                {filtered.map((meta) => (
                  <button
                    key={meta.type}
                    onClick={() => handleSelectMeta(meta)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white",
                      "hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all duration-150",
                      "group active:scale-[0.98]"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0",
                      "transition-transform duration-150 group-hover:scale-110",
                      meta.color
                    )}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{meta.label}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{meta.description}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 py-12 text-center">
                    <p className="text-slate-400 text-sm">No steps found for "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Step 2: Confirm selection */}
        {selectedMeta && (
          <>
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100">
              <button
                onClick={() => setSelectedMeta(null)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-3 transition-colors w-fit"
              >
                <ArrowLeft size={13} /> Back to all steps
              </button>
              <DialogTitle className="text-base font-semibold text-slate-800">
                Add: {selectedMeta.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 p-6">
              {/* Node preview card */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
                  selectedMeta.color
                )}>
                  {selectedMeta.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedMeta.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedMeta.description}</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-5 flex items-center gap-1.5">
                <Zap size={11} className="text-amber-400" />
                This step will be added to your workflow. Configure it after adding.
              </p>

              <button
                onClick={handleConfirm}
                className={cn(
                  "w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm",
                  "hover:bg-indigo-700 active:scale-[0.98] transition-all duration-150",
                  "flex items-center justify-center gap-2 shadow-sm"
                )}
              >
                Add {selectedMeta.label}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
