import { cn } from "./lib";
import { DitherSeparator } from "./DitherSeparator";

export type Step = { label: string; hint?: string };

export interface DitherStepperProps {
  steps: Step[];
  /** Index of the active step. */
  current: number;
  className?: string;
}

/**
 * DitherStepper — progress indicator with done/active/todo states. Verbatim
 * port of DitherStepper.vue. Pure render (guide §10: low risk). Uses
 * `DitherSeparator` for the connecting rules between steps (cross-group import,
 * Feedback group — already landed at `./DitherSeparator`).
 */
export function DitherStepper({ steps, current, className }: DitherStepperProps) {
  function state(i: number): "done" | "active" | "todo" {
    return i < current ? "done" : i === current ? "active" : "todo";
  }

  return (
    <ol className={cn("flex items-start", className)} role="list" aria-label="Progress">
      {steps.map((s, i) => {
        const st = state(i);
        return (
          <li
            key={i}
            className="flex flex-1 flex-col items-center"
            aria-current={i === current ? "step" : undefined}
          >
            <div className="flex w-full items-center">
              {i > 0 ? (
                <DitherSeparator
                  className={cn("flex-1", st === "todo" ? "opacity-30" : "")}
                />
              ) : (
                <span className="flex-1" />
              )}
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors",
                  st === "done" && "border-foreground/30 bg-foreground/10 text-foreground",
                  st === "active" && "border-foreground bg-background text-foreground",
                  st === "todo" && "border-border text-muted-foreground",
                )}
              >
                {st === "done" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {i < steps.length - 1 ? (
                <DitherSeparator
                  className={cn(
                    "flex-1",
                    state(i + 1) === "todo" && st !== "active"
                      ? "opacity-30"
                      : st === "todo"
                        ? "opacity-30"
                        : "",
                  )}
                />
              ) : (
                <span className="flex-1" />
              )}
            </div>
            <span
              className={cn(
                "mt-2 text-center text-[12px]",
                i === current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {s.hint ? (
              <span className="text-center text-[11px] text-muted-foreground/60">
                {s.hint}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
