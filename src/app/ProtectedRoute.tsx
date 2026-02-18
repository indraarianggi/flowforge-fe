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
