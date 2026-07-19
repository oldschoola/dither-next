// Shared canvas painter for DitherToggle / DitherToggleGroup — the rest
// gradient fill behind a pressed label, edged with 1px brighter lines.
// Uses RasterBuffer + putRasterBuffer for bulk pixel writes (10–20x faster
// than per-pixel fillRect for typical toggle sizes), per dither-kit/AGENTS.md.
// Framework-agnostic — no React import.

import { BAYER4, clamp01 } from "./pixel"
import type { Rgb } from "./palette"
import { createRasterBuffer, putRasterBuffer } from "./raster"

const CELL = 2

/** DitherBadge's rest gradient fill behind the pressed label — sized from the
 * host button and edged with the 1px brighter lines. Shared with
 * DitherToggleGroup. Uses RasterBuffer for bulk pixel writes instead of
 * per-pixel fillRect (10-20x faster for typical toggle sizes). */
export function paintToggleCanvas(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  fill: Rgb,
  matrix: number[][] = BAYER4,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return
  const box = host.getBoundingClientRect()
  const cols = Math.max(4, Math.round(box.width / CELL))
  const rows = Math.max(4, Math.round(box.height / CELL))
  canvas.width = cols
  canvas.height = rows
  const buf = createRasterBuffer(cols, rows)
  const { data } = buf
  const [r, g, b] = fill
  for (let y = 0; y < rows; y++) {
    const density = 0.25 + 0.75 * ((y + 0.5) / rows)
    for (let x = 0; x < cols; x++) {
      const lit = density > matrix[y & 3][x & 3]
      const k = 0.3 + density * 0.7
      const a = clamp01(lit ? k : k * 0.4)
      const idx = (y * cols + x) * 4
      data[idx] = (r * a + 0.5) | 0
      data[idx + 1] = (g * a + 0.5) | 0
      data[idx + 2] = (b * a + 0.5) | 0
      data[idx + 3] = 255
    }
  }
  // Edge lines (top/bottom/left/right) at 50% opacity
  const edgeA = 0.5
  const er = (r * edgeA + 0.5) | 0
  const eg = (g * edgeA + 0.5) | 0
  const eb = (b * edgeA + 0.5) | 0
  for (let x = 0; x < cols; x++) {
    let idx = x * 4
    data[idx] = er
    data[idx + 1] = eg
    data[idx + 2] = eb
    data[idx + 3] = 255
    idx = ((rows - 1) * cols + x) * 4
    data[idx] = er
    data[idx + 1] = eg
    data[idx + 2] = eb
    data[idx + 3] = 255
  }
  for (let y = 0; y < rows; y++) {
    let idx = y * cols * 4
    data[idx] = er
    data[idx + 1] = eg
    data[idx + 2] = eb
    data[idx + 3] = 255
    idx = (y * cols + cols - 1) * 4
    data[idx] = er
    data[idx + 1] = eg
    data[idx + 2] = eb
    data[idx + 3] = 255
  }
  putRasterBuffer(ctx, buf)
}

export { CELL as TOGGLE_CELL }
