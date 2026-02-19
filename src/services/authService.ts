// src/services/authService.ts
import { delay } from "@/lib/delay"
import storage, { STORAGE_KEYS } from "@/lib/storage"
import { seedUser } from "@/mocks"
import type { User } from "@/types"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    await delay(600)
    // In mock mode, any email/password works — we return the seed user
    // but update the name/email to what they typed
    const user: User = {
      ...seedUser,
      email: credentials.email,
      updatedAt: new Date().toISOString(),
    }
    storage.set(STORAGE_KEYS.user, user)
    return user
  },

  async register(data: RegisterData): Promise<User> {
    await delay(800)
    const user: User = {
      id: `user-${Date.now()}`,
      email: data.email,
      name: data.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    storage.set(STORAGE_KEYS.user, user)
    return user
  },

  async logout(): Promise<void> {
    await delay(200)
    storage.clearAll()
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100)
    return storage.get<User>(STORAGE_KEYS.user)
  },

  async updateProfile(data: { name: string }): Promise<User> {
    await delay(400)
    const user = storage.get<User>(STORAGE_KEYS.user)
    if (!user) throw new Error("Not authenticated")
    const updated: User = { ...user, name: data.name, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.user, updated)
    return updated
  },
}
