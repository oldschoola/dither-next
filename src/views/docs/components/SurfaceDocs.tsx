"use client";

import { useState } from "react";

import {
  cn,
  cssColor,
  DitherAccordion,
  DitherAlertDialog,
  DitherButton,
  DitherDrawer,
  DitherMeter,
  DitherNavMenu,
  DitherScrollArea,
  DitherSeparator,
  DitherSidebar,
  DitherSidebarGroup,
  DitherSidebarItem,
  DitherSidebarSub,
  DitherSwipeArea,
  DitherSwitch,
  DitherToaster,
  DitherToolbar,
  toast,
} from "@dither-kit";

import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";

const FAQ = [
  { value: "what", title: "What is dithering?" },
  { value: "why", title: "Why canvas?" },
  { value: "copy", title: "Can I copy the kit out?" },
];

const SNAPS = [0.35, 0.75];
const ACTIONS = ["Duplicate", "Rename", "Export PNG", "Move to group"];

const SIDEBAR_VARIANTS = ["default", "floating", "inset", "washed"] as const;

const NAV_ITEMS = [
  { label: "Overview" },
  { label: "Components" },
  { label: "Pricing" },
  { label: "Docs" },
];

const METERS = [
  { label: "Disk", value: 35 },
  { label: "Memory", value: 68 },
  { label: "CPU", value: 92 },
];

const SNIPPET_ACCORDION = `<DitherAccordion
  value={faq}
  onChange={setFaq}
  items={items}
  type="single"
  color="blue"
  slots={{
    what: <>Ordered dithering trades smooth gradients for a fixed threshold
      matrix — the same Bayer 4x4 behind every fill in this kit.</>,
    why: <>One engine paints every fill, so components stay coherent.</>,
    copy: <>Yes — the kit folder has zero app imports; copy it and alias it.</>,
  }}
/>`;

const SNIPPET_ALERT_DIALOG = `<DitherButton color="red" onClick={() => setOpen(true)}>Delete artboard…</DitherButton>
<DitherAlertDialog
  open={open}
  danger
  title="Delete artboard?"
  description="This removes the artboard and its layers. There is no undo across sessions."
  confirmLabel="Delete"
  onConfirm={() => setOpen(false)}
  onCancel={() => setOpen(false)}
/>`;

const SNIPPET_DRAWER = `{/* side drawers swipe-dismiss along their axis;
     bottom sheets get a handle and dismiss downward */}
<DitherDrawer open={open} side="right" title="Settings" onClose={() => setOpen(false)}>
  …
</DitherDrawer>
<DitherDrawer open={sheet} side="bottom" title="Notifications" onClose={() => setSheet(false)} />

{/* nesting: a child drawer pushes its parent back automatically */}
<DitherDrawer open={account} title="Account" onClose={() => setAccount(false)}>
  <DitherDrawer open={security} title="Security" onClose={() => setSecurity(false)} />
</DitherDrawer>

{/* swipe-to-open from the viewport edge */}
<DitherSwipeArea side="right" onOpen={() => setOpen(true)} />

{/* snap points: vh fractions or px; flicks can skip points */}
<DitherDrawer snapPoint={snap} open={open} side="bottom"
  snapPoints={[0.35, 0.75]} onClose={() => setOpen(false)} />

{/* indent: your app scales back while any drawer is open */}
<DitherDrawerIndent>
  <App />
</DitherDrawerIndent>`;

const SNIPPET_SIDEBAR = `<DitherSidebar value={collapsed} onChange={setCollapsed} variant="default" collapse="rail">
  header={<>…wordmark…</>}

  <DitherSidebarGroup label="Platform">   {/* label folds to a hairline on the rail */}
    <DitherSidebarItem label="Overview" active={active === 'Overview'} />
    <DitherSidebarItem label="Charts" badge={12} />  {/* badge folds to a dot */}
  </DitherSidebarGroup>

  <DitherSidebarGroup label="Library">
    <DitherSidebarSub value={subOpen} onChange={setSubOpen} label="Components">
      <DitherSidebarItem label="Buttons" />
      <DitherSidebarItem label="Forms" />
    </DitherSidebarSub>
  </DitherSidebarGroup>
</DitherSidebar>

{/* variant: default | floating | inset | washed (dither gradient chrome)
     collapse: rail | hide | none · side: left | right
     density: default | compact · toggle={false} = permanent rail */}`;

const SNIPPET_TOAST = `<DitherToaster />
<DitherButton color="green" onClick={() => toast('Saved', { color: 'green' })}>
  Save
</DitherButton>
<DitherButton color="red" onClick={() => toast('Export failed', { color: 'red' })}>
  Export
</DitherButton>`;

const SNIPPET_METER = `<div className="grid gap-3">
  <div>
    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
      <span>Disk</span><span>35%</span>
    </div>
    <DitherMeter value={35} />
  </div>
  <div>
    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
      <span>Memory</span><span>68%</span>
    </div>
    <DitherMeter value={68} />
  </div>
  <div>
    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
      <span>CPU</span><span>92%</span>
    </div>
    <DitherMeter value={92} />
  </div>
</div>`;

const SNIPPET_SCROLL_AREA = `<DitherScrollArea class="h-40 rounded-lg border border-border/60 p-3">
  {Array.from({ length: 15 }, (_, i) => (
    <p key={i} className="py-1 text-[12px] text-muted-foreground">
      Log line {i + 1} — ordered dither keeps the texture coherent.
    </p>
  ))}
</DitherScrollArea>`;

const SNIPPET_TOOLBAR = `<DitherToolbar label="Formatting">
  <DitherButton class="px-2.5 py-1" aria-label="Bold">B</DitherButton>
  <DitherButton class="px-2.5 py-1" aria-label="Italic">I</DitherButton>
  <DitherButton class="px-2.5 py-1" aria-label="Underline">U</DitherButton>
  <DitherSeparator orientation="vertical" class="mx-1 h-5" />
  <DitherButton class="px-2.5 py-1" aria-label="Align left">⇤</DitherButton>
  <DitherButton class="px-2.5 py-1" aria-label="Align center">⇹</DitherButton>
  <DitherButton class="px-2.5 py-1" aria-label="Align right">⇥</DitherButton>
</DitherToolbar>`;

const SNIPPET_NAV_MENU = `<DitherNavMenu value={active} onChange={setActive} items={items} color="blue" />
<p className="mt-4 text-[12px] text-muted-foreground">Viewing: {active}</p>`;

const API: Record<string, PropRow[]> = {
  accordion: [
    { prop: "items", type: "{ value: string; title: string }[]", default: "—" },
    { prop: "value", type: "string | string[]", default: "—" },
    { prop: "type", type: '"single" | "multiple"', default: '"single"' },
    { prop: "color", type: "PixelColor", default: '"blue"' },
  ],
  alertDialog: [
    { prop: "open", type: "boolean", default: "—" },
    { prop: "title", type: "string", default: "—" },
    { prop: "description", type: "string", default: "undefined" },
    { prop: "confirmLabel", type: "string", default: '"Confirm"' },
    { prop: "cancelLabel", type: "string", default: '"Cancel"' },
    { prop: "danger", type: "boolean", default: "false" },
  ],
  drawer: [
    { prop: "open", type: "boolean", default: "—" },
    { prop: "side", type: '"right" | "left" | "bottom"', default: '"right"' },
    { prop: "title", type: "string", default: "undefined" },
    { prop: "swipe", type: "boolean — drag to dismiss, momentum decides", default: "true" },
    { prop: "snapPoints", type: "number[] — ≤1 vh fraction, >1 px (bottom)", default: "undefined" },
    { prop: "snapPoint", type: "number — snapPoint/onSnapPointChange", default: "first snap" },
    { prop: "modal", type: "boolean — false: no backdrop, page stays live", default: "true" },
    { prop: "dismissible", type: "boolean — false: backdrop click ignored", default: "true" },
  ],
  sidebar: [
    { prop: "value (Sidebar)", type: "boolean — collapsed (value/onChange)", default: "false" },
    { prop: "variant (Sidebar)", type: '"default" | "floating" | "inset" | "washed"', default: '"default"' },
    { prop: "collapse (Sidebar)", type: '"rail" | "hide" | "none"', default: '"rail"' },
    { prop: "side (Sidebar)", type: '"left" | "right"', default: '"left"' },
    { prop: "density (Sidebar)", type: '"default" | "compact"', default: '"default"' },
    { prop: "toggle (Sidebar)", type: "boolean — false: permanent rail", default: "true" },
    { prop: "wash-color (Sidebar)", type: 'PixelColor — for variant="washed"', default: '"blue"' },
    { prop: "label (Group)", type: "string — folds to a hairline on the rail", default: "undefined" },
    { prop: "label / active / color (Item)", type: "string / boolean / PixelColor", default: '— / false / "blue"' },
    { prop: "badge (Item)", type: "string | number — dot on the rail", default: "undefined" },
    { prop: "value / label (Sub)", type: "boolean (value/onChange) / string", default: "false / —" },
  ],
  toast: [
    { prop: "message", type: "string", default: "—" },
    { prop: "opts.color", type: "PixelColor", default: '"blue"' },
    { prop: "opts.duration", type: "number", default: "3500" },
  ],
  meter: [
    { prop: "value", type: "number", default: "—" },
    { prop: "min", type: "number", default: "0" },
    { prop: "max", type: "number", default: "100" },
    { prop: "low", type: "number", default: "0.5" },
    { prop: "high", type: "number", default: "0.8" },
  ],
  scrollArea: [{ prop: "class", type: "string", default: "undefined" }],
  toolbar: [{ prop: "label", type: "string", default: "undefined" }],
  navMenu: [
    { prop: "items", type: "{ label: string; href?: string }[]", default: "—" },
    { prop: "value", type: "string", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
  ],
};

export function SurfaceDocs() {
  // --- accordion ---
  const [faq, setFaq] = useState("what");

  // --- alert dialog ---
  const [alertOpen, setAlertOpen] = useState(false);
  const [lastChoice, setLastChoice] = useState("nothing yet");

  // --- drawers ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gridSnap, setGridSnap] = useState(true);
  const [showRulers, setShowRulers] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapAt, setSnapAt] = useState(0.35);
  const [sheetActions, setSheetActions] = useState(false);
  const [lastAction, setLastAction] = useState("none");
  const [nestedOpen, setNestedOpen] = useState(false);
  const [nestedChild, setNestedChild] = useState(false);
  const [swipeAreaOn, setSwipeAreaOn] = useState(false);
  const [swipeDrawer, setSwipeDrawer] = useState(false);

  // --- sidebar ---
  const [sidebarActive, setSidebarActive] = useState("Overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSubOpen, setSidebarSubOpen] = useState(true);
  const [variantActive, setVariantActive] = useState("Overview");
  const [modeActive, setModeActive] = useState("Overview");

  // --- nav menu ---
  const [navActive, setNavActive] = useState("Overview");

  return (
    <>
      {/* Accordion */}
      <section id="accordion" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Accordion</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A stack of disclosure rows animated through grid-template-rows, each
          with the 2px dithered rail. Single type closes siblings on open.
        </p>
        <DemoCard code={SNIPPET_ACCORDION}>
          <div className="mx-auto max-w-sm">
            <DitherAccordion
              value={faq}
              onChange={(v) => setFaq(typeof v === "string" ? v : "")}
              items={FAQ}
              type="single"
              color="blue"
              slots={{
                what: (
                  <>
                    Ordered dithering trades smooth gradients for a fixed
                    threshold matrix — the same Bayer 4x4 behind every fill in
                    this kit.
                  </>
                ),
                why: <>One engine paints every fill, so components stay coherent.</>,
                copy: (
                  <>Yes — the kit folder has zero app imports; copy it and alias it.</>
                ),
              }}
            />
          </div>
        </DemoCard>
        <PropsTable rows={API.accordion} />
      </section>

      {/* Alert Dialog */}
      <section id="alert-dialog" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Alert Dialog</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A modal that demands an answer — overlay clicks do nothing, Escape
          cancels, and focus lands on the safe Cancel button. Danger seeds the
          confirm fill red.
        </p>
        <DemoCard code={SNIPPET_ALERT_DIALOG}>
          <div className="flex flex-col items-center gap-4">
            <DitherButton color="red" onClick={() => setAlertOpen(true)}>
              Delete artboard…
            </DitherButton>
            <p className="text-[12px] text-muted-foreground">Last choice: {lastChoice}</p>
            <DitherAlertDialog
              open={alertOpen}
              danger
              title="Delete artboard?"
              description="This removes the artboard and its layers. There is no undo across sessions."
              confirmLabel="Delete"
              onConfirm={() => {
                setAlertOpen(false);
                setLastChoice("confirmed");
              }}
              onCancel={() => {
                setAlertOpen(false);
                setLastChoice("cancelled");
              }}
            />
          </div>
        </DemoCard>
        <PropsTable rows={API.alertDialog} />
      </section>

      {/* Drawer */}
      <section id="drawer" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Drawer</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A side panel that slides in over a scrim — Escape or scrim click
          closes, the close button takes focus on open.
        </p>
        <DemoCard code={SNIPPET_DRAWER}>
          <div className="flex flex-wrap justify-center gap-3">
            <DitherButton onClick={() => setDrawerOpen(true)}>Open settings</DitherButton>
            <DitherButton color="purple" onClick={() => setSheetOpen(true)}>
              Bottom sheet
            </DitherButton>
            <DitherButton
              color="pink"
              onClick={() => {
                setSnapOpen(true);
                setSnapAt(0.35);
              }}
            >
              Snap points
            </DitherButton>
            <DitherButton color="orange" onClick={() => setSheetActions(true)}>
              Action sheet
            </DitherButton>
            <DitherButton color="green" onClick={() => setNestedOpen(true)}>
              Nested
            </DitherButton>
            <DitherDrawer
              open={drawerOpen}
              side="right"
              title="Settings"
              onClose={() => setDrawerOpen(false)}
            >
              <p className="pb-2 text-[11px] text-muted-foreground">
                Swipe the panel right to dismiss.
              </p>
              <div className="flex items-center justify-between py-2 text-[13px]">
                <span>Snap to grid</span>
                <DitherSwitch
                  value={gridSnap}
                  onChange={setGridSnap}
                  label="Snap to grid"
                  color="green"
                />
              </div>
              <div className="flex items-center justify-between py-2 text-[13px]">
                <span>Show rulers</span>
                <DitherSwitch value={showRulers} onChange={setShowRulers} label="Show rulers" />
              </div>
            </DitherDrawer>
            <DitherDrawer
              open={sheetOpen}
              side="bottom"
              title="Notifications"
              onClose={() => setSheetOpen(false)}
            >
              <p className="text-[13px] text-muted-foreground">
                You are all caught up. Drag the handle down to dismiss — a flick
                counts through its momentum, a slow drag settles back.
              </p>
            </DitherDrawer>
            <DitherDrawer
              snapPoint={snapAt}
              onSnapPointChange={setSnapAt}
              open={snapOpen}
              side="bottom"
              title="Snap points"
              snapPoints={SNAPS}
              onClose={() => setSnapOpen(false)}
            >
              <p className="text-[13px] text-muted-foreground">
                Resting at{" "}
                <span className="text-foreground tabular-nums">
                  {Math.round(snapAt * 100)}vh
                </span>
                . Drag the handle up for the tall snap, down to the short one —
                a flick&apos;s momentum can skip straight past a point. Below
                half the smallest snap, it dismisses.
              </p>
            </DitherDrawer>
            <DitherDrawer
              open={sheetActions}
              side="bottom"
              title="Artboard"
              onClose={() => setSheetActions(false)}
            >
              <div className="grid gap-1 pb-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="rounded-md px-3 py-2 text-left text-[13px] text-foreground/90 transition-colors hover:bg-background"
                    onClick={() => {
                      setLastAction(a);
                      setSheetActions(false);
                    }}
                  >
                    {a}
                  </button>
                ))}
                <div className="my-1 h-px bg-border/60" />
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-background"
                  style={{ color: cssColor("red") }}
                  onClick={() => {
                    setLastAction("Delete");
                    setSheetActions(false);
                  }}
                >
                  Delete artboard
                </button>
              </div>
            </DitherDrawer>
            <p className="w-full text-center text-[11px] text-muted-foreground">
              last action: {lastAction}
            </p>
            <DitherDrawer
              open={nestedOpen}
              side="right"
              title="Account"
              onClose={() => setNestedOpen(false)}
            >
              <p className="pb-3 text-[13px] text-muted-foreground">
                Opening a child pushes this drawer back — scaled, dimmed, out of
                reach until the child closes.
              </p>
              <DitherButton color="green" onClick={() => setNestedChild(true)}>
                Security settings
              </DitherButton>
              <DitherDrawer
                open={nestedChild}
                side="right"
                title="Security"
                onClose={() => setNestedChild(false)}
              >
                <p className="text-[13px] text-muted-foreground">
                  Independently focus-managed; Escape closes just this one.
                </p>
              </DitherDrawer>
            </DitherDrawer>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          swipe to open
        </h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4">
          <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
            <code className="text-foreground/80">DitherSwipeArea</code> is an
            invisible strip on the viewport edge — arm it, then swipe inward
            from the right edge of your screen to open the drawer.
          </p>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">arm edge</span>
            <DitherSwitch
              value={swipeAreaOn}
              onChange={setSwipeAreaOn}
              label="Arm swipe area"
              color="purple"
            />
          </div>
          {swipeAreaOn ? (
            <DitherSwipeArea side="right" onOpen={() => setSwipeDrawer(true)} />
          ) : null}
          <DitherDrawer
            open={swipeDrawer}
            side="right"
            title="From the edge"
            onClose={() => setSwipeDrawer(false)}
          >
            <p className="text-[13px] text-muted-foreground">Opened by an edge swipe.</p>
          </DitherDrawer>
        </div>
        <PropsTable rows={API.drawer} />
      </section>

      {/* Sidebar */}
      <section id="sidebar" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Sidebar</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          An app sidebar that collapses to an icon rail — items keep their hit
          area, labels fold away, the active item carries a dithered rail.
        </p>
        <DemoCard code={SNIPPET_SIDEBAR}>
          <div className="mx-auto flex h-80 max-w-md overflow-hidden rounded-lg border border-border/60">
            <DitherSidebar
              value={sidebarCollapsed}
              onValueChange={setSidebarCollapsed}
              label="Demo sidebar"
              header={
                <div className="flex h-8 items-center gap-2 px-2.5">
                  <span className="inline-block size-2.5 shrink-0 rounded-[2px] bg-foreground" />
                  {!sidebarCollapsed ? (
                    <span className="text-[12px] tracking-tight">dither-ui</span>
                  ) : null}
                </div>
              }
            >
              <DitherSidebarGroup label="Platform">
                <DitherSidebarItem
                  label="Overview"
                  active={sidebarActive === "Overview"}
                  onSelect={() => setSidebarActive("Overview")}
                />
                <DitherSidebarItem
                  label="Charts"
                  badge={12}
                  active={sidebarActive === "Charts"}
                  onSelect={() => setSidebarActive("Charts")}
                />
                <DitherSidebarItem
                  label="Alerts"
                  badge={3}
                  color="red"
                  active={sidebarActive === "Alerts"}
                  onSelect={() => setSidebarActive("Alerts")}
                />
              </DitherSidebarGroup>
              <DitherSidebarGroup label="Library">
                <DitherSidebarSub
                  label="Components"
                  value={sidebarSubOpen}
                  onValueChange={setSidebarSubOpen}
                >
                  <DitherSidebarItem
                    label="Buttons"
                    active={sidebarActive === "Buttons"}
                    onSelect={() => setSidebarActive("Buttons")}
                  />
                  <DitherSidebarItem
                    label="Forms"
                    active={sidebarActive === "Forms"}
                    onSelect={() => setSidebarActive("Forms")}
                  />
                </DitherSidebarSub>
                <DitherSidebarItem
                  label="Palette"
                  active={sidebarActive === "Palette"}
                  onSelect={() => setSidebarActive("Palette")}
                />
              </DitherSidebarGroup>
            </DitherSidebar>
            <div className="grid flex-1 place-items-center text-[12px] text-muted-foreground">
              {sidebarActive}
            </div>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          variants
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SIDEBAR_VARIANTS.map((v) => (
            <div key={v}>
              <div
                className={cn(
                  "flex h-44 overflow-hidden rounded-lg border border-border/60",
                  v === "inset" ? "bg-card/30 p-1.5" : "",
                )}
              >
                <DitherSidebar
                  variant={v}
                  collapse="none"
                  washColor={v === "washed" ? "purple" : undefined}
                  label={`${v} sidebar`}
                  class="w-32"
                >
                  {["Overview", "Charts", "Palette"].map((item) => (
                    <DitherSidebarItem
                      key={item}
                      label={item}
                      color={v === "washed" ? "purple" : "blue"}
                      active={variantActive === item}
                      onSelect={() => setVariantActive(item)}
                    />
                  ))}
                </DitherSidebar>
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    v === "inset"
                      ? "m-1.5 rounded-md border border-border/60 bg-background"
                      : "",
                  )}
                />
              </div>
              <div className="mt-2 text-center text-[10px] text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          modes
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex h-48 overflow-hidden rounded-lg border border-border/60">
              <DitherSidebar
                collapse="none"
                density="compact"
                label="Compact sidebar"
                class="w-36"
              >
                <DitherSidebarGroup label="Files">
                  {["index.ts", "palette.ts", "pixel.ts", "gesture.ts", "lib.ts"].map(
                    (item) => (
                      <DitherSidebarItem
                        key={item}
                        label={item}
                        active={modeActive === item}
                        onSelect={() => setModeActive(item)}
                      />
                    ),
                  )}
                </DitherSidebarGroup>
              </DitherSidebar>
              <div className="min-w-0 flex-1" />
            </div>
            <div className="mt-2 text-center text-[10px] text-muted-foreground">
              density=&quot;compact&quot;
            </div>
          </div>
          <div>
            <div className="flex h-48 overflow-hidden rounded-lg border border-border/60">
              <DitherSidebar
                collapse="rail"
                value={true}
                toggle={false}
                label="Permanent rail"
              >
                {["Overview", "Charts", "Alerts"].map((item) => (
                  <DitherSidebarItem
                    key={item}
                    label={item}
                    badge={item === "Alerts" ? 2 : undefined}
                    color={item === "Alerts" ? "red" : "blue"}
                    active={modeActive === item}
                    onSelect={() => setModeActive(item)}
                  />
                ))}
              </DitherSidebar>
              <div className="grid min-w-0 flex-1 place-items-center text-[11px] text-muted-foreground">
                {modeActive}
              </div>
            </div>
            <div className="mt-2 text-center text-[10px] text-muted-foreground">
              permanent rail · :toggle=&quot;false&quot;
            </div>
          </div>
        </div>
        <PropsTable rows={API.sidebar} />
      </section>

      {/* Toast */}
      <section id="toast" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Toast</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A module-level toast() call feeds a teleported bottom-right stack;
          each toast carries a 3px dithered rail in its color and dismisses
          itself after its duration. API table below documents the toast()
          function.
        </p>
        <DemoCard code={SNIPPET_TOAST}>
          <div className="flex justify-center gap-3">
            <DitherToaster />
            <DitherButton color="green" onClick={() => toast("Saved", { color: "green" })}>
              Save
            </DitherButton>
            <DitherButton color="red" onClick={() => toast("Export failed", { color: "red" })}>
              Export
            </DitherButton>
          </div>
        </DemoCard>
        <PropsTable rows={API.toast} />
      </section>

      {/* Meter */}
      <section id="meter" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Meter</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A static gauge on the progress track — the fill seed picks itself:
          green below the low mark, orange between, red above the high mark.
        </p>
        <DemoCard code={SNIPPET_METER}>
          <div className="mx-auto grid max-w-sm gap-3">
            {METERS.map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{m.label}</span>
                  <span>{m.value}%</span>
                </div>
                <DitherMeter value={m.value} />
              </div>
            ))}
          </div>
        </DemoCard>
        <PropsTable rows={API.meter} />
      </section>

      {/* Scroll Area */}
      <section id="scroll-area" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Scroll Area</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          An honest overflow container — no canvas, just thin token-colored
          scrollbars that match the house border.
        </p>
        <DemoCard code={SNIPPET_SCROLL_AREA}>
          <DitherScrollArea class="mx-auto h-40 max-w-sm rounded-lg border border-border/60 p-3">
            {Array.from({ length: 15 }, (_, i) => i + 1).map((i) => (
              <p key={i} className="py-1 text-[12px] text-muted-foreground">
                Log line {i} — ordered dither keeps the texture coherent.
              </p>
            ))}
          </DitherScrollArea>
        </DemoCard>
        <PropsTable rows={API.scrollArea} />
      </section>

      {/* Toolbar */}
      <section id="toolbar" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Toolbar</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A roving-tabindex strip — one Tab stop for the whole bar, arrow keys
          walk the buttons, Home and End jump to the edges.
        </p>
        <DemoCard code={SNIPPET_TOOLBAR}>
          <div className="flex justify-center">
            <DitherToolbar label="Formatting">
              <DitherButton class="px-2.5 py-1" aria-label="Bold">
                B
              </DitherButton>
              <DitherButton class="px-2.5 py-1" aria-label="Italic">
                I
              </DitherButton>
              <DitherButton class="px-2.5 py-1" aria-label="Underline">
                U
              </DitherButton>
              <DitherSeparator orientation="vertical" class="mx-1 h-5" />
              <DitherButton class="px-2.5 py-1" aria-label="Align left">
                ⇤
              </DitherButton>
              <DitherButton class="px-2.5 py-1" aria-label="Align center">
                ⇹
              </DitherButton>
              <DitherButton class="px-2.5 py-1" aria-label="Align right">
                ⇥
              </DitherButton>
            </DitherToolbar>
          </div>
        </DemoCard>
        <PropsTable rows={API.toolbar} />
      </section>

      {/* Navigation Menu */}
      <section id="nav-menu" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Navigation Menu</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          DitherTabs&apos; sliding dithered underline with nav semantics —
          anchors instead of tabs, aria-current on the active page.
        </p>
        <DemoCard code={SNIPPET_NAV_MENU}>
          <div className="mx-auto max-w-sm">
            <DitherNavMenu
              value={navActive}
              onValueChange={setNavActive}
              items={NAV_ITEMS}
              color="blue"
            />
            <p className="mt-4 text-[12px] text-muted-foreground">Viewing: {navActive}</p>
          </div>
        </DemoCard>
        <PropsTable rows={API.navMenu} />
      </section>
    </>
  );
}
