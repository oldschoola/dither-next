/**
 * Docs navigation registry — the sidebar IA and the section→pack map.
 *
 * Verbatim port of the `GROUPS` array in `src/pages/docs/DocsPage.vue` (script
 * section). Section ids are PERMANENT deep links — relabel freely, never
 * rename an id (docs/AGENTS.md).
 *
 * Each pack exports a React component that renders all of its sections in
 * order; the route page (`app/docs/[section]/page.tsx`) looks the section id
 * up here to pick which pack renders, and the sidebar spreads these groups
 * to render the rail.
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

/**
 * Which "page" a section belongs to. The Vue docs was a single long page; the
 * Next.js port routes each section to its own URL (`/docs/<id>`) but the
 * content is grouped so the reader keeps context. This maps a section id to a
 * logical content group so the route page can render the right pack.
 *
 * Packs: `overview` (Quick start), `handbook` (Styling/Composition/Seeds/
 * Motion/Accessibility), `examples-core` (Dashboard/Shell/Monitoring/Team/
 * Usage/Signin), `examples-auth`, `examples-product`, `components-charts`
 * (Area/Line/Bar/Pie/Radar/Sparkline + Button/Avatar/Gradient/Image/Palette),
 * and one pack per component-doc group (form/field/selection/feedback/
 * structure/overlay/surface/navigation).
 */
export type PackKey =
  | "overview"
  | "handbook"
  | "examples-core"
  | "examples-auth"
  | "examples-product"
  | "components-charts"
  | "components-form"
  | "components-field"
  | "components-selection"
  | "components-feedback"
  | "components-structure"
  | "components-overlay"
  | "components-surface"
  | "components-navigation";

const TRUE = true as const;
const record = (ids: readonly { id: string }[]): Record<string, true> =>
  Object.fromEntries(ids.map((i) => [i.id, TRUE]));

const CHART_SECTION_IDS: Record<string, true> = record([
  { id: "area" }, { id: "line" }, { id: "bar" }, { id: "pie" }, { id: "radar" },
  { id: "sparkline" }, { id: "button" }, { id: "avatar" }, { id: "gradient" },
  { id: "image" }, { id: "palette" },
]);
const EXAMPLES_CORE_IDS: Record<string, true> = record([
  { id: "dashboard" }, { id: "shell" }, { id: "monitoring" }, { id: "team" },
  { id: "usage" }, { id: "signin" },
]);
const EXAMPLES_AUTH_IDS: Record<string, true> = record(AUTH_NAV);
const EXAMPLES_PRODUCT_IDS: Record<string, true> = record(PRODUCT_NAV);
const FORM_IDS: Record<string, true> = record(FORM_NAV);
const FIELD_IDS: Record<string, true> = record(FIELD_NAV);
const SELECTION_IDS: Record<string, true> = record(SELECTION_NAV);
const FEEDBACK_IDS: Record<string, true> = record(FEEDBACK_NAV);
const STRUCTURE_IDS: Record<string, true> = record(STRUCTURE_NAV);
const OVERLAY_IDS: Record<string, true> = record(OVERLAY_NAV);
const SURFACE_IDS: Record<string, true> = record(SURFACE_NAV);
const NAVIGATION_IDS: Record<string, true> = record(NAVIGATION_NAV);

const HANDBOOK_IDS: Record<string, true> = {
  styling: TRUE, composition: TRUE, seeds: TRUE, motion: TRUE, accessibility: TRUE,
};

/**
 * Map a section id to its pack key. Multi-branch lookup that the route page
 * uses to pick which section pack renders — non-trivial, kept as a function
 * because the branch set is the durable contract.
 */
export function packOf(section: string): PackKey {
  if (section === "getting-started") return "overview";
  if (HANDBOOK_IDS[section]) return "handbook";
  if (EXAMPLES_CORE_IDS[section]) return "examples-core";
  if (EXAMPLES_AUTH_IDS[section]) return "examples-auth";
  if (EXAMPLES_PRODUCT_IDS[section]) return "examples-product";
  if (CHART_SECTION_IDS[section]) return "components-charts";
  if (FORM_IDS[section]) return "components-form";
  if (FIELD_IDS[section]) return "components-field";
  if (SELECTION_IDS[section]) return "components-selection";
  if (FEEDBACK_IDS[section]) return "components-feedback";
  if (STRUCTURE_IDS[section]) return "components-structure";
  if (OVERLAY_IDS[section]) return "components-overlay";
  if (SURFACE_IDS[section]) return "components-surface";
  if (NAVIGATION_IDS[section]) return "components-navigation";
  return "overview";
}
