import { cn } from "./lib";
import styles from "./scroll-area.module.css";

export interface DitherScrollAreaProps {
  class?: string;
  children?: React.ReactNode;
}

/**
 * DitherScrollArea — pure-CSS thin-scrollbar wrapper. Verbatim port of
 * DitherScrollArea.vue: the scoped `<style>` block becomes a co-located CSS
 * Module (guide §6). No state, no effects — a Server Component.
 */
export function DitherScrollArea({ class: className, children }: DitherScrollAreaProps) {
  return (
    <div className={cn(styles.scroll, "overflow-auto", className)}>{children}</div>
  );
}
