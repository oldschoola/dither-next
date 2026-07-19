"use client"

import { CartesianCanvas } from "./cartesian-canvas"
import { defineCartesianChart } from "./cartesian-root"

/**
 * Composable dither **area** chart. Compose `<Area>`, `<Grid>`, axes, … inside.
 *
 * React port of the Vue `area-chart.ts` factory call — delegates to the
 * shared cartesian root factory with the area chart's canvas painter.
 */
export const AreaChart = defineCartesianChart("area", CartesianCanvas)

/**
 * Composable dither **line** chart — `<Line>` series with a glow under the line.
 *
 * Same factory, `line` chart type, shared cartesian canvas painter.
 */
export const LineChart = defineCartesianChart("line", CartesianCanvas)
