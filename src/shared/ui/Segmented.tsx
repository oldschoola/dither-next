"use client";

import { cn } from "@/shared/lib";

export interface SegmentedProps<T extends string | number> {
  options: readonly T[];
  value: T;
  label?: string;
  onChange?: (value: T) => void;
}

/**
 * Segmented — a row of mutually-exclusive buttons. Verbatim port of
 * `src/shared/ui/Segmented.vue`.
 *
 * `v-model` → `value` / `onChange` (guide §4). Generic over `T extends
 * string | number` like the Vue SFC's `<script setup generic>`.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  label,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="flex items-center gap-2">
      {label ? (
        <span className="w-14 shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="flex flex-1 flex-wrap rounded-md border border-border bg-background/60 p-0.5">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            className={cn(
              "rounded-[5px] px-2 py-1 text-[11px] leading-none transition-colors",
              opt === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange?.(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
