# Phase 4: Layouts & Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up React Router 6 with all application routes, build the three layout shells (AppLayout, AuthLayout, EditorLayout), and add route protection via ProtectedRoute.

**Architecture:** React Router 6 with `createBrowserRouter`. Three layout components wrap route groups. `ProtectedRoute` checks `localStorage` for a signed-in user and redirects to `/login` if absent. Page components are stubbed — they render placeholder text until later phases fill them in.

**Tech Stack:** React Router 6, React 18, TypeScript, Tailwind CSS, Lucide React, shadcn/ui

---

### Task 1: Set Up React Router

**Files:**
- Create: `src/app/router.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/app/router.tsx`**
```tsx
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
```

**Step 2: Update `src/App.tsx`**
```tsx
import { RouterProvider } from "react-router-dom"
import { router } from "./app/router"

export default function App() {
  return <RouterProvider router={router} />
}
```

---

### Task 2: Create ProtectedRoute

**Files:**
- Create: `src/app/ProtectedRoute.tsx`

**Step 1: Write the component**
```tsx
// src/app/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import type { User } from "@/types"

export function ProtectedRoute() {
  const user = storage.get<User>(STORAGE_KEYS.user)
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
```

---

### Task 3: Build AuthLayout

**Files:**
- Create: `src/app/layouts/AuthLayout.tsx`

**Step 1: Write the layout**
```tsx
// src/app/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 10L8 5L13 10L8 15L3 10Z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M9 10L14 5L19 10L14 15L9 10Z"
                fill="white"
                fillOpacity="0.5"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">FlowForge</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
```

---

### Task 4: Build AppLayout (Sidebar)

**Files:**
- Create: `src/app/layouts/AppLayout.tsx`

**Step 1: Write the layout**
```tsx
// src/app/layouts/AppLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { LayoutDashboard, Key, Settings, LogOut, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import type { User } from "@/types"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/credentials", icon: Key, label: "Credentials" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

export function AppLayout() {
  const navigate = useNavigate()
  const user = storage.get<User>(STORAGE_KEYS.user)

  function handleLogout() {
    storage.clearAll()
    navigate("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  return (
    <div className="flex h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1e1e1e] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">FlowForge</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name ?? "User"}</p>
              <p className="text-white/50 text-xs truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/40 hover:text-white/80 transition-colors"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

---

### Task 5: Build EditorLayout

**Files:**
- Create: `src/app/layouts/EditorLayout.tsx`

**Step 1: Write the layout**
```tsx
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
```

---

### Task 6: Add Inter Font

**Files:**
- Modify: `index.html`

**Step 1: Add Google Fonts link to `index.html` `<head>`**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

---

### Task 7: Verify Routing Works

**Step 1: Start dev server**
```bash
pnpm dev
```

**Step 2: Manual verification checklist**

Visit each route and verify:
- `http://localhost:5173/` → redirects to `/login` (no user in storage yet)
- `http://localhost:5173/login` → shows AuthLayout card with "Login (coming soon)"
- `http://localhost:5173/register` → shows AuthLayout card with "Register (coming soon)"

Manually set a user in browser console to test protected routes:
```js
localStorage.setItem('flowforge:user', JSON.stringify({id:'u1',name:'Test User',email:'test@test.com',createdAt:'',updatedAt:''}))
```

Then verify:
- `http://localhost:5173/dashboard` → shows sidebar + "Dashboard (coming soon)"
- `http://localhost:5173/credentials` → shows sidebar + "Credentials (coming soon)"
- `http://localhost:5173/settings` → shows sidebar + "Settings (coming soon)"
- `http://localhost:5173/workflows/new` → shows full-screen EditorLayout + "Workflow Editor (coming soon)"
- `http://localhost:5173/login` → should still work (auth routes don't require login)

---

### Task 8: Run Tests & Commit

**Step 1: Run all tests**
```bash
pnpm test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: add layouts, routing, and ProtectedRoute"
```
