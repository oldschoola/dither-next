import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import {
  DitherBadge,
  DitherButton,
  DitherCheckbox,
  DitherDialog,
  DitherField,
  DitherGradient,
  DitherInput,
  DitherSelect,
  DitherSwitch,
  DitherTabs,
  DitherTextarea,
  dismiss,
  toast,
  useToasts,
} from "@dither-kit"

// Port of tests/components/kit.spec.ts. Vue `mount(Comp, { props, slots })`
// becomes RTL `render(<Comp {...props}>{slot}</Comp>)`; Vue wrapper queries
// (`w.find("button")`, `w.get("input")`) become `screen.getByRole` /
// `container.querySelector`. `wrapper.trigger("click")` becomes `fireEvent`
// or `userEvent`. The observable contracts (rendered output, a11y wiring,
// event emission, toast store behaviour) are identical.

describe("precompiled surfaces", () => {
  it("uses the packaged image without creating a canvas", () => {
    const { container } = render(<DitherGradient precompiled="/assets/gradient.webp" />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/assets/gradient.webp")
    expect(container.querySelector("canvas")).toBeNull()
  })
})

describe("DitherButton", () => {
  it("renders slot content in a native button", () => {
    render(<DitherButton>Deploy</DitherButton>)
    const button = screen.getByRole("button", { name: "Deploy" })
    expect(button.tagName).toBe("BUTTON")
    expect(button).toHaveTextContent("Deploy")
  })
  it("preserves native type and exposes loading state", () => {
    render(
      <DitherButton type="submit" loading>
        Save
      </DitherButton>,
    )
    const button = screen.getByRole("button")
    expect(button).toHaveAttribute("type", "submit")
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })
})

describe("DitherSwitch", () => {
  it("toggles via onChange", async () => {
    const onChange = vi.fn()
    render(<DitherSwitch value={false} label="Power" onChange={onChange} />)
    // DitherSwitch renders role="switch" (not a plain button).
    await userEvent.click(screen.getByRole("switch", { name: "Power" }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it("does not emit when disabled", async () => {
    const onChange = vi.fn()
    render(<DitherSwitch value={false} label="Power" disabled onChange={onChange} />)
    await userEvent.click(screen.getByRole("switch", { name: "Power" }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("DitherCheckbox", () => {
  it("toggles via onChange", async () => {
    const onChange = vi.fn()
    render(<DitherCheckbox value={true} onChange={onChange}>Remember me</DitherCheckbox>)
    // DitherCheckbox renders role="checkbox"; the accessible name is the slot.
    await userEvent.click(screen.getByRole("checkbox", { name: /Remember me/ }))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

describe("field controls", () => {
  it("connects generated label, description, and invalid state", () => {
    render(
      <DitherField label="Website" error="Required">
        <DitherInput />
      </DitherField>,
    )
    const input = screen.getByLabelText("Website")
    const label = screen.getByText("Website").closest("label")
    expect(label).toHaveAttribute("for", input.getAttribute("id"))
    const alert = screen.getByRole("alert")
    expect(input).toHaveAttribute("aria-describedby", alert.getAttribute("id"))
    expect(input).toHaveAttribute("aria-invalid", "true")
  })
  it("forwards textarea attributes and emits input", () => {
    // Vue's wrapper.setValue("Hello") sets the whole value in one shot; RTL's
    // userEvent.type fires per keystroke. fireEvent.change matches the Vue
    // contract (one emission with the final value).
    const onChange = vi.fn()
    render(<DitherTextarea value="" name="bio" rows={5} onChange={onChange} />)
    const textarea = screen.getByRole("textbox")
    expect(textarea).toHaveAttribute("name", "bio")
    expect(textarea).toHaveAttribute("rows", "5")
    fireEvent.change(textarea, { target: { value: "Hello" } })
    expect(onChange).toHaveBeenCalledWith("Hello")
  })
  it("generates unique field relationships", () => {
    render(
      <>
        <DitherField label="One">
          <DitherInput />
        </DitherField>
        <DitherField label="Two">
          <DitherInput />
        </DitherField>
      </>,
    )
    const one = screen.getByLabelText("One")
    const two = screen.getByLabelText("Two")
    expect(one.getAttribute("id")).not.toBe(two.getAttribute("id"))
  })
})

describe("DitherSelect", () => {
  it("links its listbox and skips disabled options with keyboard", () => {
    const onChange = vi.fn()
    const { container } = render(
      <DitherSelect
        value=""
        options={[
          { value: "a", label: "A", disabled: true },
          { value: "b", label: "B" },
        ]}
        onChange={onChange}
      />,
    )
    // DitherSelect's trigger is a <button> with aria-haspopup="listbox"
    // (no combobox role). Query it directly.
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-haspopup="listbox"]',
    )!
    // ArrowDown opens the panel and moves the highlight past the disabled
    // first option onto "B".
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    const listbox = screen.getByRole("listbox")
    expect(trigger).toHaveAttribute("aria-controls", listbox.getAttribute("id"))
    // Enter picks the highlighted (non-disabled) option.
    fireEvent.keyDown(trigger, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith("b")
  })
})

describe("DitherDialog", () => {
  it("labels, traps, closes, and restores focus", async () => {
    const opener = document.createElement("button")
    document.body.append(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const onClose = vi.fn()
    const { rerender } = render(
      <DitherDialog open={false} title="Settings" description="Project options" onClose={onClose}>
        <button id="last">Apply</button>
      </DitherDialog>,
    )

    // Open the dialog. useInDom() flips false→true on the first effect, then
    // usePresence mounts the panel, then the focus effect schedules a
    // setTimeout(0) to focus the close button. Each is a separate commit, so
    // flush several microtask/timer cycles to let them all settle in jsdom.
    rerender(
      <DitherDialog open={true} title="Settings" description="Project options" onClose={onClose}>
        <button id="last">Apply</button>
      </DitherDialog>,
    )
    for (const ms of [0, 10, 50]) {
      await act(async () => {
        await new Promise<void>((r) => setTimeout(r, ms))
      })
    }

    const dialog = screen.getByRole("dialog")
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id)
    const close = within(dialog).getByLabelText("Close")
    expect(document.activeElement).toBe(close)

    // Tab on the last focusable wraps back to the close button (focus trap).
    const last = within(dialog).getByText("Apply")
    last.focus()
    expect(document.activeElement).toBe(last)
    fireEvent.keyDown(dialog, { key: "Tab" })
    expect(document.activeElement).toBe(close)

    // Close button fires onClose.
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Closing restores focus to the opener. usePresence keeps the panel
    // mounted through its 180ms leave transition; the focus-trap cleanup
    // restores focus once `open` flips false. Advance past the leave window.
    rerender(
      <DitherDialog open={false} title="Settings" description="Project options" onClose={onClose}>
        <button id="last">Apply</button>
      </DitherDialog>,
    )
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 200))
    })
    expect(document.activeElement).toBe(opener)

    opener.remove()
  })
})

describe("DitherTabs", () => {
  it("renders every tab and emits the clicked one", async () => {
    const onChange = vi.fn()
    render(
      <DitherTabs tabs={["One", "Two", "Three"]} value="One" onChange={onChange} />,
    )
    const tabs = screen.getAllByRole("tab")
    expect(tabs.length).toBeGreaterThanOrEqual(3)
    await userEvent.click(screen.getByRole("tab", { name: "Two" }))
    expect(onChange).toHaveBeenCalledWith("Two")
  })
})

describe("DitherBadge", () => {
  it("renders slot content", () => {
    render(<DitherBadge>beta</DitherBadge>)
    expect(screen.getByText("beta")).toBeInTheDocument()
  })
})

// The toast store is a module-level singleton read via the useToasts() hook.
// The Vue spec mutated the `toasts` reactive array directly; the React port
// exposes it only through the hook, so we render a probe that reflects the
// store into the DOM and drive toast()/dismiss() against the same singleton.
function ToastProbe() {
  const toasts = useToasts()
  return (
    <div data-testid="toasts" data-count={toasts.length}>
      {toasts.map((t) => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe("toast store", () => {
  it("push + manual dismiss", () => {
    const { rerender } = render(<ToastProbe />)
    // Clear any toasts left by prior tests (module-level singleton).
    const existing = screen.queryAllByTestId(/^toast-/)
    act(() => {
      for (const el of existing) {
        const id = Number(el.getAttribute("data-testid")!.replace("toast-", ""))
        dismiss(id)
      }
    })
    rerender(<ToastProbe />)

    act(() => {
      toast("saved")
    })
    rerender(<ToastProbe />)
    expect(screen.getByTestId("toasts")).toHaveAttribute("data-count", "1")
    expect(screen.getByText("saved")).toBeInTheDocument()

    const id = Number(
      screen.getByTestId(/^toast-/).getAttribute("data-testid")!.replace("toast-", ""),
    )
    act(() => {
      dismiss(id)
    })
    rerender(<ToastProbe />)
    expect(screen.getByTestId("toasts")).toHaveAttribute("data-count", "0")
  })
  it("auto-dismisses after its duration", () => {
    vi.useFakeTimers()
    render(<ToastProbe />)
    // Clear leftovers from the singleton.
    const existing = screen.queryAllByTestId(/^toast-/)
    for (const el of existing) {
      const id = Number(el.getAttribute("data-testid")!.replace("toast-", ""))
      dismiss(id)
    }

    act(() => {
      toast("bye", { duration: 1000 })
    })
    expect(screen.getByTestId("toasts")).toHaveAttribute("data-count", "1")
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.getByTestId("toasts")).toHaveAttribute("data-count", "0")
  })
})
