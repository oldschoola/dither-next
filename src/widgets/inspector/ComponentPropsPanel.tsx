"use client";

import type { ComponentEntry } from "@/entities/widget";
import { colorToHex } from "@dither-kit";
import { ColorField, NumberField, Segmented, Toggle } from "@/shared/ui";

/** Spec-driven prop controls for a registry component. Verbatim port of
 * `src/widgets/inspector/ComponentPropsPanel.vue`.
 *
 * The Vue SFC mutated `target.props[key]` / `target.slotText` directly. In
 * React the target is immutable, so this panel takes explicit callbacks the
 * parent wires to `patchSelectedArtboard` (for a standalone component frame)
 * or to a screen-cell mutation. `props` / `slotText` are the current values;
 * `onPropChange` / `onSlotTextChange` apply the next value. */

export interface ComponentPropsPanelProps {
  entry: ComponentEntry;
  props: Record<string, unknown>;
  slotText: string | null;
  onPropChange: (key: string, value: unknown) => void;
  onSlotTextChange: (value: string) => void;
}

const listText = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") : String(v ?? "");

/** PixelColor may be a legacy hue number — coerce for the ColorField. */
const asFieldColor = (c: unknown): string =>
  typeof c === "number" ? colorToHex(c) : (c as string);

export function ComponentPropsPanel({
  entry,
  props,
  slotText,
  onPropChange,
  onSlotTextChange,
}: ComponentPropsPanelProps) {
  const inputClass =
    "w-full rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-accent/60";

  return (
    <div className="flex flex-col gap-3">
      {slotText != null ? (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="w-14 shrink-0">text</span>
          <input
            type="text"
            name="component-slot"
            autoComplete="off"
            value={slotText}
            className={inputClass}
            onChange={(e) => onSlotTextChange(e.target.value)}
          />
        </label>
      ) : null}

      {entry.props.map((spec) => {
        if (spec.kind === "text") {
          return (
            <label
              key={spec.key}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span className="w-14 shrink-0">{spec.key}</span>
              <input
                type="text"
                name={`prop-${spec.key}`}
                autoComplete="off"
                value={(props[spec.key] as string) ?? ""}
                className={inputClass}
                onChange={(e) => onPropChange(spec.key, e.target.value)}
              />
            </label>
          );
        }

        if (spec.kind === "list") {
          return (
            <label
              key={spec.key}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span className="w-14 shrink-0">{spec.key}</span>
              <input
                type="text"
                name={`prop-${spec.key}`}
                autoComplete="off"
                placeholder="One, Two, Three"
                value={listText(props[spec.key])}
                className={inputClass}
                onChange={(e) =>
                  onPropChange(
                    spec.key,
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
          );
        }

        if (spec.kind === "number") {
          return (
            <NumberField
              key={spec.key}
              label={spec.key}
              value={(props[spec.key] as number) ?? 0}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              onChange={(v) => onPropChange(spec.key, v)}
            />
          );
        }

        if (spec.kind === "select") {
          return (
            <Segmented
              key={spec.key}
              label={spec.key}
              value={(props[spec.key] as string) ?? spec.def}
              options={spec.options}
              onChange={(v) => onPropChange(spec.key, v)}
            />
          );
        }

        if (spec.kind === "color") {
          return (
            <div key={spec.key} className="text-[11px] text-muted-foreground">
              <span className="mb-1 block">{spec.key}</span>
              <ColorField
                value={asFieldColor(props[spec.key])}
                onChange={(v) => onPropChange(spec.key, v)}
              />
            </div>
          );
        }

        // spec.kind === "boolean"
        return (
          <Toggle
            key={spec.key}
            label={spec.key}
            value={(props[spec.key] as boolean) ?? false}
            onChange={(v) => onPropChange(spec.key, v)}
          />
        );
      })}
    </div>
  );
}
