"use client";

import { useMemo } from "react";
import { resolveTexture, type TextureConfig, type VariantInput } from "@dither-kit";
import { VARIANTS } from "@/shared/config";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

export interface TextureFieldProps {
  value: VariantInput;
  onChange?: (value: VariantInput) => void;
}

const CHOICES = [...VARIANTS, "custom"] as const;

const SLIDERS = [
  { key: "ramp", label: "fade", min: 0, max: 1, step: 0.05 },
  { key: "density", label: "density", min: 0, max: 1, step: 0.05 },
  { key: "offTier", label: "off tier", min: 0, max: 1, step: 0.05 },
  { key: "edge", label: "edge", min: 0, max: 1, step: 0.05 },
] as const;

/**
 * TextureField — variant preset picker + custom texture sliders. Verbatim
 * port of `src/shared/ui/TextureField.vue`. `v-model` → `value` / `onChange`.
 *
 * When switching to "custom", the field seeds from the current preset so the
 * switch is seamless (clamp solid's internal always-lit bias back into the
 * visible 0–1 range) — same as the Vue SFC.
 */
export function TextureField({ value, onChange }: TextureFieldProps) {
  const choice = typeof value === "string" ? value : "custom";

  const tex = useMemo<Required<TextureConfig>>(
    () => ({ ...resolveTexture(value) }),
    [value],
  );

  function setChoice(v: string | number) {
    if (v === "custom") {
      const seed = { ...resolveTexture(value) };
      seed.density = Math.min(1, seed.density);
      onChange?.(seed);
    } else {
      onChange?.(v as VariantInput);
    }
  }

  function set<K extends keyof TextureConfig>(key: K, val: TextureConfig[K]) {
    onChange?.({ ...tex, density: Math.min(1, tex.density), [key]: val });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Segmented options={CHOICES} value={choice} label="variant" onChange={setChoice} />
      {choice === "custom" ? (
        <>
          {SLIDERS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">{s.label}</span>
              <input
                type="range"
                name={`tex-${s.key}`}
                min={s.min}
                max={s.max}
                step={s.step}
                value={tex[s.key]}
                className="flex-1 accent-foreground"
                onChange={(e) => set(s.key, Number(e.target.value) as never)}
              />
              <span className="w-8 shrink-0 text-right tabular-nums text-foreground">
                {tex[s.key].toFixed(2)}
              </span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">hatch</span>
            <input
              type="range"
              name="tex-hatch"
              min="0"
              max="8"
              step="1"
              value={tex.hatch}
              className="flex-1 accent-foreground"
              onChange={(e) => set("hatch", Number(e.target.value) as never)}
            />
            <span className="w-8 shrink-0 text-right tabular-nums text-foreground">
              {tex.hatch || "off"}
            </span>
          </label>
          <Toggle
            value={tex.gaps}
            label="real gaps (dotted look)"
            onChange={(v) => set("gaps", v as never)}
          />
        </>
      ) : null}
    </div>
  );
}
