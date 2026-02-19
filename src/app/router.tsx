import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "./layouts/AppLayout"
import { AuthLayout } from "./layouts/AuthLayout"
import { EditorLayout } from "./layouts/EditorLayout"
import { ProtectedRoute } from "./ProtectedRoute"
import { LoginPage } from "./routes/login"
import { RegisterPage } from "./routes/register"
import { DashboardPage } from "./routes/dashboard"
import { WorkflowEditorPage } from "./routes/workflow-editor"
import { ExecutionMonitorPage } from "./routes/execution-monitor"
import { ExecutionHistoryPage } from "./routes/execution-history"
const CredentialsPage = () => <div className="p-6 text-lg font-medium">Credentials (coming soon)</div>
const SettingsPage = () => <div className="p-6 text-lg font-medium">Settings (coming soon)</div>

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
