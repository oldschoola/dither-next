"use client";

import { useState } from "react";

import {
  DitherAvatar,
  DitherBadge,
  DitherButton,
  DitherContextMenu,
  DitherMenu,
  DitherMenubar,
  DitherPopover,
  DitherPreviewCard,
  DitherTooltip,
} from "@dither-kit";
import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";

const MENU_ITEMS = [
  { label: "New" },
  { label: "Duplicate" },
  { divider: true },
  { label: "Delete", danger: true },
];

const CTX_ITEMS = [
  { label: "Cut" },
  { label: "Copy" },
  { label: "Paste" },
  { divider: true },
  { label: "Delete", danger: true },
];

const MENUBAR = [
  {
    label: "File",
    items: [{ label: "New" }, { label: "Open" }, { label: "Save" }],
  },
  {
    label: "Edit",
    items: [{ label: "Undo" }, { label: "Redo" }, { label: "Find" }],
  },
  {
    label: "View",
    items: [{ label: "Zoom in" }, { label: "Zoom out" }],
  },
];

const SNIPPET_POPOVER = `<script setup>
const open = ref(false)
<\/script>

<DitherPopover :open="open" align="center" @close="open = false">
  <template #trigger>
    <DitherButton @click="open = !open">Open popover</DitherButton>
  </template>
  <p class="text-[12px] leading-relaxed text-muted-foreground">
    Anchored to its trigger — Escape or an outside press closes it.
  </p>
</DitherPopover>`;

const SNIPPET_MENU = `<script setup>
const items = [
  { label: "New" },
  { label: "Duplicate" },
  { divider: true },
  { label: "Delete", danger: true },
]
<\/script>

<DitherMenu :items="items" @select="(label) => run(label)">
  Actions
</DitherMenu>`;

const SNIPPET_CONTEXT = `<script setup>
const items = [
  { label: "Cut" },
  { label: "Copy" },
  { label: "Paste" },
  { divider: true },
  { label: "Delete", danger: true },
]
<\/script>

<DitherContextMenu :items="items" @select="(label) => run(label)">
  <div class="rounded-lg border border-dashed border-border p-10">
    right-click me
  </div>
</DitherContextMenu>`;

const SNIPPET_MENUBAR = `<script setup>
const menus = [
  { label: "File", items: [{ label: "New" }, { label: "Open" }, { label: "Save" }] },
  { label: "Edit", items: [{ label: "Undo" }, { label: "Redo" }, { label: "Find" }] },
  { label: "View", items: [{ label: "Zoom in" }, { label: "Zoom out" }] },
]
const last = ref("none")
<\/script>

<DitherMenubar :menus="menus" @select="(m, i) => (last = \`\${m} → \${i}\`)" />
<p class="mt-3 text-[12px] text-muted-foreground">last action: {{ last }}</p>`;

const SNIPPET_TOOLTIP = `<DitherTooltip text="Deploys are frozen until Monday">
  <DitherBadge color="orange">frozen</DitherBadge>
</DitherTooltip>`;

const SNIPPET_PREVIEW = `<DitherPreviewCard>
  <template #trigger>
    <span class="underline decoration-border underline-offset-4" tabindex="0">
      @ada
    </span>
  </template>
  <div class="flex items-center gap-3">
    <DitherAvatar name="Ada Lovelace" :size="40" />
    <div>
      <p class="text-[13px]">Ada Lovelace</p>
      <p class="text-[11px] text-muted-foreground">Wrote the first program.</p>
    </div>
  </div>
</DitherPreviewCard>`;

const API: Record<string, PropRow[]> = {
  popover: [
    { prop: "open", type: "boolean", default: "—" },
    { prop: "align", type: '"start" | "center" | "end"', default: '"start"' },
  ],
  menu: [{ prop: "items", type: "MenuItem[]", default: "—" }],
  contextMenu: [{ prop: "items", type: "ContextMenuItem[]", default: "—" }],
  menubar: [
    {
      prop: "menus",
      type: "{ label: string; items: MenubarItem[] }[]",
      default: "—",
    },
  ],
  tooltip: [
    { prop: "text", type: "string", default: "—" },
    { prop: "delay", type: "number", default: "300" },
  ],
  previewCard: [{ prop: "delay", type: "number", default: "400" }],
};

export function OverlayDocs() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuAction, setMenuAction] = useState("none");
  const [ctxAction, setCtxAction] = useState("none");
  const [lastAction, setLastAction] = useState("none");

  return (
    <>
      {/* Popover */}
      <section id="popover" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Popover</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          An anchored panel below its trigger — bring your own trigger and content.
          Escape or an outside press emits close.
        </p>
        <DemoCard code={SNIPPET_POPOVER}>
          <div className="flex justify-center">
            <DitherPopover
              open={popoverOpen}
              align="center"
              onClose={() => setPopoverOpen(false)}
              trigger={
                <DitherButton onClick={() => setPopoverOpen(!popoverOpen)}>
                  Open popover
                </DitherButton>
              }
            >
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Anchored to its trigger — Escape or an outside press closes it.
              </p>
            </DitherPopover>
          </div>
        </DemoCard>
        <PropsTable rows={API.popover} />
      </section>

      {/* Menu */}
      <section id="menu" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Menu</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A dropdown menu behind a single button — arrow keys move focus, Enter
          selects, Escape closes and refocuses the trigger.
        </p>
        <DemoCard code={SNIPPET_MENU}>
          <div className="flex flex-col items-center gap-3">
            <DitherMenu items={MENU_ITEMS} onSelect={(label) => setMenuAction(label)}>
              Actions
            </DitherMenu>
            <p className="text-[12px] text-muted-foreground">
              last action: {menuAction}
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.menu} />
      </section>

      {/* Context Menu */}
      <section id="context-menu" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Context Menu</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A right-click menu teleported to the pointer — same items and keyboard
          behavior as Menu, dismissed by Escape or any outside press.
        </p>
        <DemoCard code={SNIPPET_CONTEXT}>
          <div className="flex flex-col items-center gap-3">
            <DitherContextMenu
              items={CTX_ITEMS}
              onSelect={(label) => setCtxAction(label)}
            >
              <div className="flex h-32 w-64 items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-muted-foreground select-none">
                right-click me
              </div>
            </DitherContextMenu>
            <p className="text-[12px] text-muted-foreground">
              last action: {ctxAction}
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.contextMenu} />
      </section>

      {/* Menubar */}
      <section id="menubar" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Menubar</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A desktop-style horizontal bar — one menu open at a time, hover switches
          between top items, ArrowLeft/Right move across them.
        </p>
        <DemoCard code={SNIPPET_MENUBAR}>
          <div className="flex flex-col items-center gap-3">
            <DitherMenubar
              menus={MENUBAR}
              onSelect={(menu, item) => setLastAction(`${menu} → ${item}`)}
            />
            <p className="text-[12px] text-muted-foreground">
              last action: {lastAction}
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.menubar} />
      </section>

      {/* Tooltip */}
      <section id="tooltip" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Tooltip</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A delayed hover tip above its target — also shows on focus, hides on
          leave, blur, or Escape. No transition under reduced motion.
        </p>
        <DemoCard code={SNIPPET_TOOLTIP}>
          <div className="flex justify-center">
            <DitherTooltip text="Deploys are frozen until Monday">
              <DitherBadge color="orange">frozen</DitherBadge>
            </DitherTooltip>
          </div>
        </DemoCard>
        <PropsTable rows={API.tooltip} />
      </section>

      {/* Preview Card */}
      <section id="preview-card" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Preview Card</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A hover preview for rich content — opens after a delay on hover or focus;
          a short close delay lets the pointer travel into the card.
        </p>
        <DemoCard code={SNIPPET_PREVIEW}>
          <div className="flex justify-center">
            <DitherPreviewCard
              trigger={
                <span
                  className="cursor-pointer text-[13px] underline decoration-border underline-offset-4"
                  tabIndex={0}
                >
                  @ada
                </span>
              }
            >
              <div className="flex items-center gap-3">
                <DitherAvatar name="Ada Lovelace" size={40} />
                <div>
                  <p className="text-[13px] text-foreground">Ada Lovelace</p>
                  <p className="text-[11px] text-muted-foreground">
                    Wrote the first program.
                  </p>
                </div>
              </div>
            </DitherPreviewCard>
          </div>
        </DemoCard>
        <PropsTable rows={API.previewCard} />
      </section>
    </>
  );
}
