// src/lib/storage.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import storage from "./storage"

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("get returns null when key does not exist", () => {
    expect(storage.get("flowforge:missing")).toBeNull()
  })

  it("set and get round-trip", () => {
    storage.set("flowforge:test", { name: "Alice" })
    expect(storage.get("flowforge:test")).toEqual({ name: "Alice" })
  })

  it("getList returns empty array when key missing", () => {
    expect(storage.getList("flowforge:items")).toEqual([])
  })

  it("addToList appends item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.addToList("flowforge:items", { id: "2", name: "B" })
    expect(storage.getList("flowforge:items")).toHaveLength(2)
  })

  it("updateInList patches matching item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.updateInList("flowforge:items", "1", { name: "Updated" })
    const list = storage.getList<{ id: string; name: string }>("flowforge:items")
    expect(list[0].name).toBe("Updated")
  })

  it("removeFromList removes matching item", () => {
    storage.addToList("flowforge:items", { id: "1", name: "A" })
    storage.addToList("flowforge:items", { id: "2", name: "B" })
    storage.removeFromList("flowforge:items", "1")
    expect(storage.getList("flowforge:items")).toHaveLength(1)
  })
})
