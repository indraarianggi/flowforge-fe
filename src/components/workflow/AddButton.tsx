// src/components/workflow/AddButton.tsx
import { Plus } from "lucide-react"

interface Props {
  onClick: () => void
  label?: string
}

export function AddButton({ onClick, label }: Props) {
  return (
    <div className="flex flex-col items-center gap-0 my-1">
      <div className="w-px h-4 bg-slate-200" />
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-slate-300 bg-white text-slate-400 text-xs font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 group shadow-sm hover:shadow"
      >
        <Plus
          size={12}
          className="group-hover:rotate-90 transition-transform duration-200 ease-out"
        />
        {label ?? "Add step"}
      </button>
      <div className="w-px h-4 bg-slate-200" />
    </div>
  )
}
