"use client";

import { useMemo } from "react";
import { bloomFromSeed, type BloomConfig, type BloomInput, type BloomLevel } from "@dither-kit";
import { BLOOMS } from "@/shared/config";
import { Segmented } from "./Segmented";

export interface BloomFieldProps {
  value: BloomInput;
  onChange?: (value: BloomInput) => void;
}

// Mirrors the engine's bloom presets so "custom" seeds from the current look.
const SEED: Record<string, Required<Omit<BloomConfig, "blend">>> = {
  off: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  low: { blur: 3, brightness: 1.35, opacity: 0.7, saturate: 1.4 },
  high: { blur: 5, brightness: 1.5, opacity: 0.78, saturate: 1.5 },
  aura: { blur: 15, brightness: 2.9, opacity: 0.1, saturate: 3 },
};

const CHOICES = [...BLOOMS, "custom"] as const;

const SLIDERS = [
  { key: "blur", label: "blur", min: 0, max: 30, step: 1, fmt: (v: number) => `${v}px` },
  { key: "brightness", label: "bright", min: 1, max: 4, step: 0.05, fmt: (v: number) => v.toFixed(2) },
  { key: "opacity", label: "opacity", min: 0, max: 1, step: 0.02, fmt: (v: number) => v.toFixed(2) },
  { key: "saturate", label: "saturate", min: 1, max: 4, step: 0.05, fmt: (v: number) => v.toFixed(2) },
] as const;

/**
 * BloomField — bloom preset picker + custom sliders. Verbatim port of
 * `src/shared/ui/BloomField.vue`. `v-model` → `value` / `onChange`.
 */
export function BloomField({ value, onChange }: BloomFieldProps) {
  const choice = typeof value === "string" ? value : "custom";

  const cfg = useMemo<Required<Omit<BloomConfig, "blend">>>(
    () =>
      typeof value === "string"
        ? SEED[value]
        : typeof value === "number"
          ? { ...SEED.low, ...bloomFromSeed(value) }
          : { ...SEED.low, ...value },
    [value],
  );

  function setChoice(v: string | number) {
    if (v === "custom") onChange?.({ ...cfg });
    else onChange?.(v as BloomLevel);
  }

  function set(key: keyof BloomConfig, val: number) {
    onChange?.({ ...cfg, [key]: val });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Segmented options={CHOICES} value={choice} label="bloom" onChange={setChoice} />
      {choice === "custom" ? (
        <>
          {SLIDERS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">{s.label}</span>
              <input
                type="range"
                name={`bloom-${s.key}`}
                min={s.min}
                max={s.max}
                step={s.step}
                value={cfg[s.key]}
                className="flex-1 accent-foreground"
                onChange={(e) => set(s.key, Number(e.target.value))}
              />
              <span className="w-9 shrink-0 text-right tabular-nums text-foreground">
                {s.fmt(cfg[s.key])}
              </span>
            </label>
          ))}
        </>
      ) : null}
    </div>
  );
}
