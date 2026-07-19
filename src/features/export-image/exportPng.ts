"use client";

import { toPng } from "html-to-image";
import type { Artboard } from "@/entities/artboard";

/**
 * Render an artboard's DOM node (canvases + SVG chrome + HTML legend) to a
 * PNG and download it. The node is located by the data attribute the canvas
 * Artboard component stamps on its frame.
 *
 * Port of `src/features/export-image/exportPng.ts`. The Vue app dynamic-imported
 * `html-to-image`; here it's a static import (now a declared dependency) — the
 * feature is still only reached when the user clicks "png" in the selection
 * toolbar, so it doesn't bloat the initial studio bundle unless used.
 */
export async function exportArtboardPng(artboard: Artboard, scale = 2): Promise<boolean> {
  const node = document.querySelector<HTMLElement>(
    `[data-artboard-id="${artboard.id}"] [data-artboard-surface]`,
  );
  if (!node) return false;
  try {
    const url = await toPng(node, {
      pixelRatio: scale,
      width: artboard.w,
      height: artboard.h,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artboard.name.replace(/[^\w-]+/g, "-").toLowerCase() || "artboard"}.png`;
    a.click();
    return true;
  } catch {
    return false;
  }
}
