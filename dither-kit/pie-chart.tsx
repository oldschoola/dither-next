"use client"

import { PieCanvas } from "./pie-canvas"
import { definePolarChart } from "./polar-root"

/**
 * Composable dither **pie / donut** chart. Compose `<Pie>`, `<Legend>`, … inside.
 *
 * React port of the Vue `pie-chart.ts` factory call — delegates to the shared
 * polar root factory with the pie chart's canvas painter.
 */
export const PieChart = definePolarChart("pie", PieCanvas)
