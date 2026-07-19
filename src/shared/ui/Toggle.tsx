"use client";

export interface ToggleProps {
  value: boolean;
  label: string;
  onChange?: (value: boolean) => void;
}

/** Toggle — labelled checkbox. Verbatim port of `src/shared/ui/Toggle.vue`. */
export function Toggle({ value, label, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
      <input
        type="checkbox"
        name={label}
        checked={value}
        className="accent-foreground"
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </label>
  );
}
