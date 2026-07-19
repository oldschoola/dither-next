"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLORS } from "@/shared/config";
import { colorToHex, cssColor, type DitherColor, hexToHsv, hsvToHex } from "@dither-kit";

export interface ColorFieldProps {
  value: DitherColor | string;
  onChange?: (value: DitherColor | string) => void;
}

const PRESETS = COLORS as readonly string[];
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * ColorField — preset swatches + HSV picker + hex input. Verbatim port of
 * `src/shared/ui/ColorField.vue`.
 *
 * `v-model` → `value` / `onChange`. The Vue SFC's reactive `hsv` object +
 * `watch(modelValue, syncFromModel)` becomes a `useState` object synced via
 * `useEffect` on `value`. The pointer-drag on the saturation/value square
 * keeps the window-level move/up listeners so the drag survives leaving the
 * square (same as Vue).
 */
export function ColorField({ value, onChange }: ColorFieldProps) {
  const isPreset = PRESETS.includes(value as string);

  const [hsv, setHsv] = useState({ h: 210, s: 0.7, v: 0.9 });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const hex = useMemo(() => hsvToHex(hsv.h, hsv.s, hsv.v), [hsv]);

  // Sync HSV from the incoming model value — the Vue SFC skipped re-sync when
  // the change was its own emit (presets or an unchanged hex) to avoid thumb
  // jitter.
  function syncFromModel(v: DitherColor | string) {
    const c = hexToHsv(colorToHex(v));
    setHsv({ h: c.h, s: c.s, v: c.v });
  }

  useEffect(() => {
    if (!PRESETS.includes(value as string) && value === hex) return;
    syncFromModel(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const squareRef = useRef<HTMLDivElement | null>(null);

  function push() {
    onChangeRef.current?.(hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v));
  }

  function onSquare(e: React.PointerEvent) {
    const square = squareRef.current;
    if (!square) return;
    const r = square.getBoundingClientRect();
    if (!r) return;

    const move = (ev: PointerEvent) => {
      const rect = squareRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHsv((prev) => {
        const next = {
          ...prev,
          s: clamp01((ev.clientX - rect.left) / rect.width),
          v: 1 - clamp01((ev.clientY - rect.top) / rect.height),
        };
        hsvRef.current = next;
        return next;
      });
      onChangeRef.current?.(hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v));
    };
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onHue(e: React.ChangeEvent<HTMLInputElement>) {
    const h = Number(e.target.value);
    setHsv((prev) => {
      const next = { ...prev, h };
      hsvRef.current = next;
      return next;
    });
    push();
  }

  function onHex(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.replace(/(.)/g, "$1$1");
    if (/^[0-9a-fA-F]{6}$/.test(v)) onChange?.(`#${v.toLowerCase()}`);
  }

  function enableCustom() {
    onChange?.(colorToHex(valueRef.current));
  }

  const customActive = !isPreset;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="size-5 rounded-[4px] transition-transform hover:scale-110"
            style={{
              backgroundColor: cssColor(c),
              boxShadow: value === c ? undefined : undefined,
            }}
            title={c}
            aria-label={c}
            onClick={() => onChange?.(c)}
          >
            <span
              className="block size-full rounded-[4px] ring-1 ring-border"
              style={{
                boxShadow:
                  value === c
                    ? "0 0 0 2px var(--ring), 0 0 0 3px var(--background)"
                    : undefined,
              }}
            />
          </button>
        ))}
        <button
          type="button"
          className="size-5 rounded-[4px] transition-transform hover:scale-110"
          style={
            customActive
              ? { backgroundColor: hex }
              : { background: "conic-gradient(from 0deg, red, #ff0, lime, cyan, blue, magenta, red)" }
          }
          title="Custom colour"
          aria-label="Custom colour"
          onClick={enableCustom}
        />
      </div>

      {customActive ? (
        <div className="flex flex-col gap-2">
          {/* saturation / value square */}
          <div
            ref={squareRef}
            className="relative h-28 w-full cursor-crosshair overflow-hidden rounded-md ring-1 ring-border"
            style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
            onPointerDown={onSquare}
          >
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, #fff, rgba(255,255,255,0))" }}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0))" }}
            />
            <div
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          {/* hue */}
          <input
            type="range"
            name="hue"
            min="0"
            max="360"
            value={hsv.h}
            className="dk-hue h-2.5 w-full cursor-pointer appearance-none rounded-full"
            onChange={onHue}
          />

          {/* hex */}
          <div className="flex items-center gap-2">
            <span
              className="size-5 shrink-0 rounded-[4px] ring-1 ring-border"
              style={{ backgroundColor: hex }}
            />
            <input
              type="text"
              name="hex"
              spellCheck="false"
              autoComplete="off"
              value={hex}
              className="w-full rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-xs uppercase text-foreground outline-none focus:border-accent/60"
              onChange={onHex}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
