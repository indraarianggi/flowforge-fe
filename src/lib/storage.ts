// src/lib/storage.ts

const PREFIX = "flowforge:"

export const STORAGE_KEYS = {
  user: `${PREFIX}user`,
  workflows: `${PREFIX}workflows`,
  executions: `${PREFIX}executions`,
  nodeExecutions: `${PREFIX}node_executions`,
  credentials: `${PREFIX}credentials`,
} as const

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

const storage = {
  get<T>(key: string): T | null {
    return read<T>(key)
  },

  set<T>(key: string, value: T): void {
    write(key, value)
  },

  getList<T extends { id: string }>(key: string): T[] {
    return read<T[]>(key) ?? []
  },

  addToList<T extends { id: string }>(key: string, item: T): void {
    const list = read<T[]>(key) ?? []
    write(key, [...list, item])
  },

  updateInList<T extends { id: string }>(
    key: string,
    id: string,
    patch: Partial<T>
  ): void {
    const list = read<T[]>(key) ?? []
    write(
      key,
      list.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  },

  removeFromList<T extends { id: string }>(key: string, id: string): void {
    const list = read<T[]>(key) ?? []
    write(
      key,
      list.filter((item) => item.id !== id)
    )
  },

  clear(key: string): void {
    localStorage.removeItem(key)
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  },
}

export default storage
