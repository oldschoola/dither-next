import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { getEditorSnapshot } from "@/entities/editor"
import {
  createProject,
  deleteProject,
  hydrate,
  renameProject,
  switchProject,
  useActiveProjectId,
  useProjects,
} from "@/features/persistence"

// Port of tests/components/projects.spec.ts. The Vue spec read `projects`
// (a reactive array) and `activeProjectId.value` directly; the React port
// exposes both through hooks (`useProjects`, `useActiveProjectId`). We render
// a probe component that reflects the hook values into the DOM, then read
// the serialized state. The probe is re-rendered fresh in each test (RTL's
// global cleanup unmounts between tests).
//
// The persistence module is a singleton over the editor singleton — these run
// as one sequential story, resetting storage (not module state) between steps.

function StateProbe() {
  const projects = useProjects()
  const activeId = useActiveProjectId()
  return (
    <div
      data-testid="state"
      data-projects={JSON.stringify(projects)}
      data-active={activeId}
    />
  )
}

const readState = () => {
  const { unmount } = render(<StateProbe />)
  const el = document.querySelector<HTMLElement>("[data-testid='state']")!
  const state = {
    projects: JSON.parse(el.getAttribute("data-projects") || "[]") as {
      id: string
      name: string
    }[],
    activeId: el.getAttribute("data-active") || "",
  }
  // Unmount immediately so the next mutation (outside act) doesn't try to
  // update a lingering probe and trigger a React act warning.
  unmount()
  return state
}

describe("project workspace (sequential story)", () => {
  it("migrates the legacy single-document key into the first project", () => {
    localStorage.clear()
    localStorage.setItem(
      "dither-studio-v8",
      JSON.stringify({
        artboards: [
          {
            id: "legacy1",
            name: "Legacy chart",
            x: 0,
            y: 0,
            w: 520,
            h: 360,
            hidden: false,
            locked: false,
            groupId: null,
            chart: { type: "bar" },
          },
        ],
        groups: [],
      }),
    )
    hydrate()
    const state = readState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe("My project")
    const snap = getEditorSnapshot()
    expect(snap.artboards[0].name).toBe("Legacy chart")
    expect(snap.artboards[0].chart.type).toBe("bar")
    // legacy key consumed
    expect(localStorage.getItem("dither-studio-v8")).toBeNull()
  })

  it("rehydrates without duplicating project metadata", () => {
    hydrate()
    const state = readState()
    expect(state.projects).toHaveLength(1)
    expect(state.projects[0].name).toBe("My project")
  })

  it("createProject starts a fresh isolated document", () => {
    const before = getEditorSnapshot().artboards.map((a) => a.id)
    createProject("Second")
    const state = readState()
    expect(state.projects).toHaveLength(2)
    expect(state.activeId).toBe(state.projects[1].id)
    // fresh default doc, not the legacy artboards
    const snap = getEditorSnapshot()
    expect(snap.artboards.map((a) => a.id)).not.toEqual(before)
    expect(snap.artboards).toHaveLength(1)
    expect(snap.artboards[0].name).toBe("Area chart")
    expect(snap.artboards[0].x).not.toBe(0)
    expect(snap.artboards[0].y).not.toBe(0)
  })

  it("switching back restores the first project's work untouched", () => {
    const state = readState()
    switchProject(state.projects[0].id)
    expect(getEditorSnapshot().artboards[0].name).toBe("Legacy chart")
    switchProject(state.projects[1].id)
    expect(getEditorSnapshot().artboards[0].name).not.toBe("Legacy chart")
  })

  it("rename persists to the index", () => {
    const state = readState()
    renameProject(state.projects[1].id, "Renamed")
    const after = readState()
    expect(after.projects[1].name).toBe("Renamed")
    const idx = JSON.parse(localStorage.getItem("dither-studio-projects")!)
    expect(idx[1].name).toBe("Renamed")
  })

  it("deleting the active project falls back to the remaining one", () => {
    const state = readState()
    deleteProject(state.projects[1].id)
    const after = readState()
    expect(after.projects).toHaveLength(1)
    expect(after.activeId).toBe(after.projects[0].id)
    expect(getEditorSnapshot().artboards[0].name).toBe("Legacy chart")
  })

  it("deleting the last project recreates a fresh default workspace", () => {
    const state = readState()
    deleteProject(state.projects[0].id)
    const after = readState()
    expect(after.projects).toHaveLength(1)
    expect(after.projects[0].name).toBe("My project")
    const snap = getEditorSnapshot()
    expect(snap.artboards).toHaveLength(1)
    expect(snap.artboards[0].x).not.toBe(0)
    expect(snap.artboards[0].y).not.toBe(0)
  })
})
