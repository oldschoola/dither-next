/**
 * Docs navigation registry — the sidebar IA + section id list.
 *
 * Verbatim port of the `GROUPS` array in `src/pages/docs/DocsPage.vue` (script
 * section). Section ids are PERMANENT deep links — relabel freely, never
 * rename an id (docs/AGENTS.md).
 *
 * The docs page renders every section pack on ONE long scrollable page; the
 * sidebar spreads these groups to render the rail, and the scroll-spy cycles
 * `activeId` through `SECTION_IDS` as the reader scrolls. `SECTION_LABEL`
 * backs the per-URL `<title>` (each `/docs/<id>` deep-links to the same page
 * and scrolls to its section on mount).
 */
import { FORM_NAV } from "./components/form-nav";
import { FEEDBACK_NAV } from "./components/feedback-nav";
import { FIELD_NAV } from "./components/field-nav";
import { SELECTION_NAV } from "./components/selection-nav";
import { STRUCTURE_NAV } from "./components/structure-nav";
import { OVERLAY_NAV } from "./components/overlay-nav";
import { SURFACE_NAV } from "./components/surface-nav";
import { NAVIGATION_NAV } from "./components/navigation-nav";
import { AUTH_NAV } from "./examples/auth-nav";
import { PRODUCT_NAV } from "./examples/product-nav";

export type NavItem = { id: string; label: string };
export type NavGroup = { title: string; items: NavItem[] };

export const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ id: "getting-started", label: "Quick start" }],
  },
  {
    title: "Handbook",
    items: [
      { id: "styling", label: "Styling" },
      { id: "composition", label: "Composition" },
      { id: "seeds", label: "Seeds" },
      { id: "motion", label: "Animation" },
      { id: "accessibility", label: "Accessibility" },
    ],
  },
  {
    title: "Examples",
    items: [
      { id: "dashboard", label: "Dashboard" },
      { id: "shell", label: "App shell" },
      { id: "monitoring", label: "Monitoring" },
      { id: "team", label: "Team" },
      { id: "usage", label: "Usage & billing" },
      { id: "signin", label: "Sign in" },
      ...AUTH_NAV,
      ...PRODUCT_NAV,
    ],
  },
  {
    title: "Components",
    items: [
      { id: "area", label: "Area Chart" },
      { id: "line", label: "Line Chart" },
      { id: "bar", label: "Bar Chart" },
      { id: "pie", label: "Pie Chart" },
      { id: "radar", label: "Radar Chart" },
      { id: "sparkline", label: "Sparkline" },
      { id: "button", label: "Button" },
      { id: "avatar", label: "Avatar" },
      { id: "gradient", label: "Gradient" },
      { id: "image", label: "Image" },
      { id: "faulty-terminal", label: "Faulty terminal" },
      ...FORM_NAV,
      ...FIELD_NAV,
      ...SELECTION_NAV,
      ...FEEDBACK_NAV,
      ...STRUCTURE_NAV,
      ...OVERLAY_NAV,
      ...SURFACE_NAV,
      ...NAVIGATION_NAV,
    ],
  },
  { title: "Utils", items: [{ id: "palette", label: "Palette" }] },
];

/** Flat ordered list of every section id — used for scroll-spy + deep links. */
export const SECTION_IDS: string[] = GROUPS.flatMap((g) => g.items.map((i) => i.id));

/** Lookup id → label (for <title>). */
export const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
);
