import { describe, it, expect, beforeEach } from "vitest"
import { workflowService } from "./workflowService"
import storage, { STORAGE_KEYS } from "@/lib/storage"

describe("workflowService", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("list() returns seed workflows on first call", async () => {
    const workflows = await workflowService.list()
    expect(workflows.length).toBeGreaterThan(0)
  })

  it("create() adds a new workflow", async () => {
    const workflow = await workflowService.create({ name: "Test Workflow" })
    expect(workflow.name).toBe("Test Workflow")
    expect(workflow.isActive).toBe(false)

    const all = await workflowService.list()
    expect(all.some((w) => w.id === workflow.id)).toBe(true)
  })

  it("update() patches a workflow", async () => {
    const workflow = await workflowService.create({ name: "Original" })
    const updated = await workflowService.update(workflow.id, { name: "Renamed" })
    expect(updated.name).toBe("Renamed")
  })

  it("delete() removes a workflow", async () => {
    const workflow = await workflowService.create({ name: "To Delete" })
    await workflowService.delete(workflow.id)
    const all = await workflowService.list()
    expect(all.some((w) => w.id === workflow.id)).toBe(false)
  })

  it("toggleActive() flips isActive", async () => {
    const workflow = await workflowService.create({ name: "Toggle Test" })
    expect(workflow.isActive).toBe(false)
    const toggled = await workflowService.toggleActive(workflow.id)
    expect(toggled.isActive).toBe(true)
  })
})
