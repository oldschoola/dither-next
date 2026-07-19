"use client";

import type { ComponentType } from "react";
import {
  DitherAvatar,
  DitherButton,
  DitherDrawer,
  DitherField,
  DitherGradient,
  DitherImage,
  DitherInput,
  DitherSidebarGroup,
  DitherSidebarItem,
  DitherSidebarSub,
  DitherTabPanel,
  DitherTabs,
  DitherToggle,
  toast,
} from "@dither-kit";
import * as kit from "@dither-kit";
import { patchSelectedArtboard, useEditor } from "@/entities/editor";
import { componentEntry, type WidgetModel } from "@/entities/widget";
import { cn } from "@/shared/lib";
import { ScreenRenderer } from "./ScreenRenderer";

export interface WidgetRendererProps {
  widget: WidgetModel;
  artboardId: string;
}

const demoTriggerClass =
  "border border-border rounded-md bg-card px-3 py-2 text-xs font-mono text-foreground transition-colors active:scale-95 hover:bg-accent/10";

/** Immutably patch the selected artboard's component widget's live `model`.
 *  The Vue SFC mutated `widget.model` directly on the reactive object; the
 *  React store is immutable, so we patch through `patchSelectedArtboard`
 *  (guide §11). The producer receives a deep clone it may mutate in place. */
function setModel(value: unknown): void {
  patchSelectedArtboard((a) => {
    if (a.widget && a.widget.kind === "component") {
      a.widget.model = value;
    }
  });
}

/**
 * WidgetRenderer — renders a widget by kind. Verbatim port of
 * `src/widgets/widget-renderer/WidgetRenderer.vue`. Avatar/button/image/
 * gradient are direct kit renders; `screen` delegates to ScreenRenderer;
 * `component` is registry-driven: resolve via `kit[widget.is]`, map props
 * via `componentEntry`, and where `entry.demo` is set render the composed
 * demo tree exactly like the Vue template (lines 73-130).
 *
 * Kit prop contracts (guide §1, §4): the kit's pixel components
 * (DitherAvatar/Button/Image/Gradient/Tabs/TabPanel/Toggle/Input/Field/
 * Sidebar*) take `class` (Vue convention, merged via `cn`); v-model is
 * `value`/`onChange` for most, `value`/`onValueChange` for DitherSidebar +
 * DitherSidebarSub. DitherPopover/DitherPreviewCard take a `trigger` prop
 * (the Vue `#trigger` slot) and content as `children`. The chart roots use
 * `className` — not used here.
 */
export function WidgetRenderer({ widget, artboardId }: WidgetRendererProps) {
  const rt = useEditor((s) => s.replayToken);
  const w = widget;

  if (w.kind === "avatar") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {/* aspect-square wrapper stands in for the Vue `style="aspect-ratio:1"`
            (DitherAvatar has no `style` prop in the React kit). */}
        <div className="h-full aspect-square">
          <DitherAvatar
            name={w.name}
            pattern={w.source !== "seed" && w.pattern ? w.pattern : undefined}
            color={w.autoColor ? undefined : w.color}
            mirror={w.mirror}
            grid={w.grid}
            cellPx={w.cellPx}
            density={w.density}
            offTier={w.offTier}
            bloom={w.bloom}
            animate={w.animate}
            animationDuration={w.animationDuration}
            replayToken={rt}
            className="h-full w-full rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (w.kind === "button") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <DitherButton
          key={`${w.color}-${w.variant}-${w.cell}-${JSON.stringify(w.bloom)}`}
          color={w.color}
          variant={w.variant}
          cell={w.cell}
          bloom={w.bloom}
          className="px-6 py-3 text-sm"
        >
          {w.label}
        </DitherButton>
      </div>
    );
  }

  if (w.kind === "component") {
    const entry = componentEntry(w.is);
    const kitRecord = kit as unknown as Record<string, ComponentType<Record<string, unknown>>>;
    const Comp: ComponentType<Record<string, unknown>> | undefined = kitRecord[w.is];
    const compProps = entry?.mapProps ? entry.mapProps(w.props) : w.props;
    const slotText = w.slotText != null ? w.slotText : undefined;
    const demo = entry?.demo;
    const label = (entry?.label ?? "").toLowerCase();
    const Generic = Comp as ComponentType<Record<string, unknown>>;

    return (
      <div className="flex h-full w-full items-center justify-center overflow-visible p-2">
        {Comp && !demo ? (
          <Generic {...compProps} className="max-h-full max-w-full">
            {slotText}
          </Generic>
        ) : demo === "tab-panel" ? (
          <DitherTabs tabs={["One", "Two"]} value="One">
            <DitherTabPanel value="One">{slotText}</DitherTabPanel>
          </DitherTabs>
        ) : demo === "field" ? (
          <Generic {...compProps}>
            <DitherInput placeholder="you@example.com" />
          </Generic>
        ) : demo === "fieldset" ? (
          <Generic {...compProps}>
            <DitherField label="Name">
              <DitherInput />
            </DitherField>
          </Generic>
        ) : demo === "form" ? (
          <Generic {...compProps} className="grid w-full gap-3">
            <DitherField label="Email">
              <DitherInput />
            </DitherField>
            <DitherButton>Submit</DitherButton>
          </Generic>
        ) : demo === "toolbar" ? (
          <Generic {...compProps}>
            <DitherToggle value={false}>Bold</DitherToggle>
            <DitherToggle value={false}>Italic</DitherToggle>
          </Generic>
        ) : demo === "sidebar" ? (
          <Generic {...compProps} value={w.model} onValueChange={setModel}>
            <DitherSidebarGroup label="Workspace">
              <DitherSidebarItem label="Dashboard" active badge="3" />
              <DitherSidebarSub label="Projects" value={true}>
                <DitherSidebarItem label="Website" />
              </DitherSidebarSub>
            </DitherSidebarGroup>
          </Generic>
        ) : demo === "toaster" ? (
          <button
            type="button"
            className={demoTriggerClass}
            onClick={() => toast(String(w.props.message), { color: w.props.color as never })}
          >
            Show toast
          </button>
        ) : demo === "popover" || demo === "preview-card" ? (
          <Generic
            {...compProps}
            open={w.model as boolean}
            onClose={() => setModel(false)}
            trigger={
              <button type="button" className={demoTriggerClass} onClick={() => setModel(true)}>
                Open {label}
              </button>
            }
          >
            {slotText}
          </Generic>
        ) : demo === "dialog" || demo === "drawer" ? (
          <>
            <button type="button" className={demoTriggerClass} onClick={() => setModel(true)}>
              Open {label}
            </button>
            <Generic {...compProps} open={w.model as boolean} onClose={() => setModel(false)}>
              {slotText}
            </Generic>
          </>
        ) : demo === "alert" ? (
          <>
            <button type="button" className={demoTriggerClass} onClick={() => setModel(true)}>
              Open {label}
            </button>
            <Generic
              {...compProps}
              open={w.model as boolean}
              onCancel={() => setModel(false)}
              onConfirm={() => setModel(false)}
            />
          </>
        ) : demo === "swipe-area" ? (
          <>
            <span className="text-xs text-muted-foreground">
              Swipe inward from the {String(w.props.side)} edge
            </span>
            <Generic {...compProps} onOpen={() => setModel(true)} />
          </>
        ) : demo === "drawer-indent" ? (
          <>
            <Generic className="rounded-lg border border-border p-6">{slotText}</Generic>
            <button
              type="button"
              className={cn(demoTriggerClass, "absolute bottom-3")}
              onClick={() => setModel(true)}
            >
              Preview indent
            </button>
            <DitherDrawer open={w.model as boolean} title="Nested drawer" onClose={() => setModel(false)}>
              Drawer content
            </DitherDrawer>
          </>
        ) : null}
      </div>
    );
  }

  if (w.kind === "image") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-md">
        <DitherImage
          key={`${w.src}-${w.cell}-${w.focusY}-${w.fade}`}
          src={w.src}
          alt={w.alt}
          cell={w.cell}
          focusY={w.focusY}
          fade={w.fade}
          className="h-full w-full"
        />
      </div>
    );
  }

  if (w.kind === "screen") {
    return <ScreenRenderer screen={w} artboardId={artboardId} />;
  }

  // gradient (final v-else)
  return (
    <div className="relative h-full w-full overflow-hidden rounded-md">
      <DitherGradient
        key={`${w.from}-${w.twoTone}-${w.to}-${w.direction}-${w.cell}-${w.opacity}-${JSON.stringify(w.bloom)}`}
        from={w.from}
        to={w.twoTone ? w.to : "transparent"}
        direction={w.direction}
        cell={w.cell}
        opacity={w.opacity}
        bloom={w.bloom}
      />
    </div>
  );
}
