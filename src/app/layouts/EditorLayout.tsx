// src/app/layouts/EditorLayout.tsx
import { Outlet } from "react-router-dom"

// EditorLayout is a full-screen wrapper with no sidebar.
// The top bar is rendered by WorkflowEditorPage itself
// because it needs access to workflow state (name, save, run).
export function EditorLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f5f5f5]">
      <Outlet />
    </div>
  )
}
