"use client"

import { BarCanvas } from "./bar-canvas"
import { defineCartesianChart } from "./cartesian-root"

/**
 * Composable dither **bar** chart — `<Bar>` series, grouped or stacked.
 *
 * React port of the Vue `bar-chart.ts` factory call — delegates to the shared
 * cartesian root factory with the bar chart's canvas painter.
 */
export const BarChart = defineCartesianChart("bar", BarCanvas)
