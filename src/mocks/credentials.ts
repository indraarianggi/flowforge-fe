import type { Credential } from "@/types"

export const seedCredentials: Credential[] = [
  {
    id: "cred-001",
    userId: "user-001",
    name: "My Telegram Bot",
    type: "telegram",
    status: "connected",
    metadata: { botUsername: "@myflowforgebot" },
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T08:00:00.000Z",
  },
  {
    id: "cred-002",
    userId: "user-001",
    name: "Google Workspace",
    type: "google",
    status: "expired",
    metadata: { email: "demo@gmail.com" },
    expiresAt: "2026-01-15T00:00:00.000Z",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
]
