"use client"

import { RadarFrame } from "./RadarFrame"
import { RadarCanvas } from "./radar-canvas"
import { definePolarChart } from "./polar-root"

/**
 * Composable dither **radar** chart. Compose `<Radar>` series, `<Legend>`, … inside.
 *
 * React port of the Vue `radar-chart.ts` factory call — delegates to the shared
 * polar root factory with the radar chart's canvas painter and the
 * `<RadarFrame>` back decoration (concentric rings + axis spokes + labels).
 */
export const RadarChart = definePolarChart("radar", RadarCanvas, RadarFrame)
