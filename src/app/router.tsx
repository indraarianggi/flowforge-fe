import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "./layouts/AppLayout"
import { AuthLayout } from "./layouts/AuthLayout"
import { EditorLayout } from "./layouts/EditorLayout"
import { ProtectedRoute } from "./ProtectedRoute"

// Page stubs — replaced in later phases
const DashboardPage = () => <div className="p-6 text-lg font-medium">Dashboard (coming soon)</div>
const WorkflowEditorPage = () => <div className="p-6 text-lg font-medium">Workflow Editor (coming soon)</div>
const ExecutionMonitorPage = () => <div className="p-6 text-lg font-medium">Execution Monitor (coming soon)</div>
const ExecutionHistoryPage = () => <div className="p-6 text-lg font-medium">Execution History (coming soon)</div>
const CredentialsPage = () => <div className="p-6 text-lg font-medium">Credentials (coming soon)</div>
const SettingsPage = () => <div className="p-6 text-lg font-medium">Settings (coming soon)</div>
const LoginPage = () => <div className="p-6 text-lg font-medium">Login (coming soon)</div>
const RegisterPage = () => <div className="p-6 text-lg font-medium">Register (coming soon)</div>

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  // Protected app routes
  {
    element: <ProtectedRoute />,
    children: [
      // App routes (with sidebar)
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/workflows/:id/executions", element: <ExecutionHistoryPage /> },
          { path: "/executions/:id", element: <ExecutionMonitorPage /> },
          { path: "/credentials", element: <CredentialsPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
      // Editor routes (full-screen, no sidebar)
      {
        element: <EditorLayout />,
        children: [
          { path: "/workflows/new", element: <WorkflowEditorPage /> },
          { path: "/workflows/:id/edit", element: <WorkflowEditorPage /> },
        ],
      },
    ],
  },
])
