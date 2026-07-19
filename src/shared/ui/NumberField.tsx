"use client";

export interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange?: (value: number) => void;
}

/**
 * NumberField — labelled numeric input. Verbatim port of
 * `src/shared/ui/NumberField.vue`. `v-model` → `value` / `onChange`.
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="w-11 shrink-0 whitespace-nowrap">{label}</span>
      <span className="relative flex-1">
        <input
          type="number"
          name={label}
          autoComplete="off"
          value={value}
          min={min}
          max={max}
          step={step}
          className="w-full min-w-0 rounded-md border border-border bg-background/60 px-2 py-1 text-xs tabular-nums text-foreground outline-none [appearance:textfield] focus:border-accent/60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onChange={(e) => {
            const v = Number(e.target.value);
            let n = Number.isFinite(v) ? v : 0;
            if (min != null) n = Math.max(min, n);
            if (max != null) n = Math.min(max, n);
            onChange?.(n);
          }}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </span>
    </label>
  );
}
