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
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <div className="flex h-screen bg-[#f5f5f5]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1e1e1e] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/30">
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
