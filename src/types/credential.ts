// src/types/credential.ts
export type CredentialType = "telegram" | "google"
export type CredentialStatus = "connected" | "expired" | "invalid"

export interface Credential {
  id: string
  userId: string
  name: string
  type: CredentialType
  status: CredentialStatus
  metadata: Record<string, unknown>
  expiresAt?: string
  createdAt: string
  updatedAt: string
}
