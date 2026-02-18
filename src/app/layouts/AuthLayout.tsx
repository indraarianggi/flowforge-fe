// src/app/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center p-4">
      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
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
                fillOpacity="0.95"
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/60 border border-white/60 p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
