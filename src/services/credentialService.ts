// src/services/credentialService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedCredentials } from "@/mocks"
import type { Credential } from "@/types"

function getCredentials(): Credential[] {
  const stored = storage.getList<Credential>(STORAGE_KEYS.credentials)
  if (stored.length === 0) {
    storage.set(STORAGE_KEYS.credentials, seedCredentials)
    return seedCredentials
  }
  return stored
}

export const credentialService = {
  async list(): Promise<Credential[]> {
    await delay(300)
    return getCredentials()
  },

  async get(id: string): Promise<Credential> {
    await delay(200)
    const cred = getCredentials().find((c) => c.id === id)
    if (!cred) throw new Error(`Credential ${id} not found`)
    return cred
  },

  async create(data: Pick<Credential, "name" | "type" | "metadata">): Promise<Credential> {
    await delay(500)
    const user = storage.get<{ id: string }>(STORAGE_KEYS.user)
    const credential: Credential = {
      id: `cred-${Date.now()}`,
      userId: user?.id ?? "user-001",
      name: data.name,
      type: data.type,
      status: "connected",
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.addToList(STORAGE_KEYS.credentials, credential)
    return credential
  },

  async update(id: string, patch: Partial<Credential>): Promise<Credential> {
    await delay(300)
    storage.updateInList<Credential>(STORAGE_KEYS.credentials, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    const updated = getCredentials().find((c) => c.id === id)
    if (!updated) throw new Error(`Credential ${id} not found`)
    return updated
  },

  async delete(id: string): Promise<void> {
    await delay(300)
    storage.removeFromList(STORAGE_KEYS.credentials, id)
  },

  async test(id: string): Promise<{ ok: boolean; message: string }> {
    await delay(800)
    // Mock: always succeeds for connected, fails for expired
    const cred = getCredentials().find((c) => c.id === id)
    if (!cred) return { ok: false, message: "Credential not found" }
    if (cred.status === "expired") {
      return { ok: false, message: "Token has expired. Please reconnect." }
    }
    return { ok: true, message: "Connection successful" }
  },
}
