/**
 * Shared dashboard datasets + helper snippets used across the docs sections.
 * Verbatim port of the module-level consts in `src/pages/docs/DocsPage.vue`.
 *
 * These are framework-agnostic plain values — extracted so every section pack
 * that needs the believable dashboard numbers (revenue/expenses, sparkline
 * trends, stat cards) reads the same source.
 */
import type { AreaVariant, DitherColor, DotVariant, VariantInput } from "@dither-kit";

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const revenue = [42, 51, 48, 63, 71, 68, 79, 86, 82, 94, 102, 118];
const expenses = [31, 34, 33, 39, 44, 47, 46, 52, 55, 58, 61, 67];

export const rows = MONTHS.map((month, i) => ({
  month,
  revenue: revenue[i],
  expenses: expenses[i],
}));

export const config = {
  revenue: { label: "Revenue", color: "blue" as DitherColor },
  expenses: { label: "Expenses", color: "purple" as DitherColor },
};

export const trafficRows = MONTHS.slice(0, 8).map((month, i) => ({
  month,
  organic: [820, 932, 901, 1290, 1330, 1320, 1450, 1682][i],
  paid: [420, 532, 501, 654, 690, 720, 810, 932][i],
}));

export const trafficConfig = {
  organic: { label: "Organic", color: "green" as DitherColor },
  paid: { label: "Paid", color: "orange" as DitherColor },
};

export const pieRows = [
  { name: "Chrome", value: 61 },
  { name: "Safari", value: 19 },
  { name: "Firefox", value: 11 },
  { name: "Other", value: 9 },
];

export const pieConfig = {
  Chrome: { label: "Chrome", color: "blue" as DitherColor },
  Safari: { label: "Safari", color: "purple" as DitherColor },
  Firefox: { label: "Firefox", color: "orange" as DitherColor },
  Other: { label: "Other", color: "grey" as DitherColor },
};

export const radarConfig = {
  current: { label: "This sprint", color: "blue" as DitherColor },
  previous: { label: "Last sprint", color: "grey" as DitherColor },
};

export const radarRows = [
  { axis: "shipped", current: 9, previous: 6 },
  { axis: "reviewed", current: 7, previous: 7 },
  { axis: "tested", current: 8, previous: 5 },
  { axis: "documented", current: 6, previous: 3 },
  { axis: "on time", current: 8, previous: 6 },
];

/** Stat-card sparklines — last 24 data points each. */
export const trend = (seed: number, drift: number) =>
  Array.from(
    { length: 24 },
    (_, i) =>
      10 +
      i * drift +
      Math.sin(i * 0.8 + seed) * 2 +
      Math.sin(i * 1.7 + seed * 2) * 1.1,
  );

export const STATS = [
  {
    label: "Revenue",
    value: "$48.2k",
    delta: "+12.4%",
    up: true,
    color: "green" as DitherColor,
    data: trend(1, 0.35),
  },
  {
    label: "Active users",
    value: "8,110",
    delta: "+3.2%",
    up: true,
    color: "blue" as DitherColor,
    data: trend(2, 0.2),
  },
  {
    label: "Error rate",
    value: "0.42%",
    delta: "−8.1%",
    up: false,
    color: "red" as DitherColor,
    data: trend(3, -0.18).map((v) => v + 8),
  },
];

export const VARIANTS: AreaVariant[] = ["gradient", "dotted", "hatched", "solid"];
export const DOT_VARIANTS: DotVariant[] = ["border", "colored-border", "filled"];

export const SEEDS = [7, 1984, 4242, 90210, 31337];

export const wave = Array.from(
  { length: 20 },
  (_, i) => 5 + Math.sin(i * 0.6) * 2.2 + Math.sin(i * 1.4) * 1,
);

export const miniRows = [4, 7, 5, 9, 6, 8].map((v, i) => ({ x: i + 1, v }));
export const miniConfig = { v: { color: "blue" as DitherColor } };
export const miniPieRows = [
  { name: "a", value: 42 },
  { name: "b", value: 33 },
  { name: "c", value: 25 },
];
export const miniPieConfig = {
  a: { color: "blue" as DitherColor },
  b: { color: "purple" as DitherColor },
  c: { color: "orange" as DitherColor },
};

export const BUTTON_COLORS: DitherColor[] = [
  "green", "blue", "purple", "pink", "orange", "red",
];

export const DIRECTIONS = ["up", "down", "left", "right"] as const;

export const COLORS: DitherColor[] = [
  "green", "blue", "purple", "pink", "orange", "red", "grey",
];

export const SHELL_NAV = ["Overview", "Reports", "Alerts", "Settings"] as const;

export const TEAM = [
  { name: "ada", role: "maintainer", commits: 284, color: "green" as DitherColor, data: trend(11, 0.3) },
  { name: "grace", role: "charts", commits: 197, color: "blue" as DitherColor, data: trend(12, 0.24) },
  { name: "linus", role: "engine", commits: 151, color: "purple" as DitherColor, data: trend(13, 0.18) },
  { name: "barbara", role: "docs", commits: 96, color: "orange" as DitherColor, data: trend(14, 0.12) },
];

export const usageRows = MONTHS.slice(0, 8).map((month, i) => ({
  month,
  renders: [212, 248, 231, 290, 341, 322, 398, 441][i],
}));
export const usageConfig = { renders: { label: "Renders (k)", color: "blue" as DitherColor } };
export const quotaRows = [
  { name: "used", value: 68 },
  { name: "free", value: 32 },
];
export const quotaConfig = {
  used: { label: "Used", color: "blue" as DitherColor },
  free: { label: "Free", color: "grey" as DitherColor },
};

export const SERVICES = [
  { name: "api-gateway", uptime: "99.98%", ok: true, color: "green" as DitherColor, data: trend(4, 0.1) },
  { name: "render-farm", uptime: "99.91%", ok: true, color: "blue" as DitherColor, data: trend(5, 0.22) },
  { name: "dither-engine", uptime: "100%", ok: true, color: "purple" as DitherColor, data: trend(6, 0.16) },
  { name: "webhook-relay", uptime: "97.20%", ok: false, color: "red" as DitherColor, data: trend(7, -0.2).map((v) => v + 8) },
];

export const effectData = MONTHS.map((month, i) => ({
  month,
  v: 8 + Math.sin(i * 0.7) * 3 + Math.sin(i * 1.9) * 1.5 + i * 0.4,
}));
export const effectConfig = { v: { label: "signal", color: "blue" as DitherColor } };

export const DURATIONS = [300, 900, 2000] as const;

/** Variant-or-seed label for gallery thumbs. */
export type PickedVariant = AreaVariant | number;

export type VariantInputType = VariantInput;
