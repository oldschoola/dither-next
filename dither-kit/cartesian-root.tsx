"use client"

import {
  isValidElement,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import {
  type ChartConfig,
  ChartContext,
  type ChartType,
  type Margins,
  useChartController,
  type ControllerInput,
} from "./chart-context"
import { CommonChartContext } from "./common-context"
import type { BloomInput, EasingInput } from "./dither-paint"
import { precompiledSrc, type PrecompiledDither } from "./precompile"
import { bloomFromSeed, easingFromSeed, geometryFromSeed, motionFromSeed } from "./dither-paint"
import { cn } from "./lib"
import type { StackType } from "./scales"
import { useChartDimensions } from "./use-chart-dimensions"

type Row = Record<string, unknown>

const DEFAULT_MARGINS: Margins = { top: 10, right: 12, bottom: 22, left: 36 }

/** Marker a chart part sets to declare which render layer it targets.
 *  `back` = behind the dither canvas (grid); `dom` = DOM legend/tooltip;
 *  omitted = the front SVG (axes, dots). */
export type ChartLayer = "back" | "dom" | "svg"

/** A component (or element) carrying a `chartLayer` static property. */
type LayeredComponent = {
  chartLayer?: ChartLayer
}

export type CartesianChartProps = {
  data: Row[]
  config: ChartConfig
  stackType?: StackType
  margins?: Partial<Margins>
  className?: string
  animate?: boolean
  /** Master seed — derives duration, delay, easing, stagger, sparkle
   *  character and bloom for every prop the consumer left unset. */
  seed?: number
  /** Dedicated edge-effect seed — pins the live-edge motion independent of
   *  the master seed. Unset: falls back to the master seed, then sparkle. */
  effect?: number
  animationDuration?: number
  animationDelay?: number
  easing?: EasingInput
  sparkles?: boolean
  hoverLift?: boolean
  stagger?: number
  cell?: number
  sparkleDensity?: number
  sparkleSpeed?: number
  barGap?: number
  barEdge?: number
  glowSize?: number
  hoverStrength?: number
  dimOpacity?: number
  crosshair?: boolean
  replayToken?: number
  interactive?: boolean
  markerIndex?: number | null
  hovered?: boolean
  bloom?: BloomInput
  bloomOnHover?: boolean
  precompiled?: PrecompiledDither
  defaultSelectedDataKey?: string | null
  onHoverChange?: (index: number | null) => void
  onSelectionChange?: (key: string | null) => void
  /** Slotted chart parts: `<Area>`, `<Grid>`, `<XAxis>`, `<Legend>`, … The
   *  factory routes each child to back-canvas / front-svg / DOM layer. */
  children?: ReactNode
}

/** The canvas component the chart paints with — `CartesianCanvas` (or a
 *  precompiled `<img>` replacement the canvas itself renders when present). */
export type ChartCanvasComponent = React.ComponentType<unknown>

/**
 * Shared root for the cartesian dither charts (area, line, bar). Owns the
 * measured size, the shared context, and pointer interaction; every visual is
 * composed as slotted children. Back chrome (grid) sits behind the dither
 * canvas; the canvas paints the fill/line/bars + stars; front chrome (axes,
 * dots) and DOM legend/tooltip layer on top. `chartType` drives the scales and
 * the `canvas` prop supplies the family's painter.
 *
 * React port of the Vue `defineCartesianChart` factory: instead of a
 * `defineComponent` + `setup` + render function, this returns a React
 * component that runs the controller hook and renders the layer composition.
 */
export function defineCartesianChart(
  chartType: ChartType,
  canvas: ChartCanvasComponent
): React.ComponentType<CartesianChartProps> {
  const Canvas = canvas
  const component = function CartesianChart(props: CartesianChartProps) {
    const { el, size } = useChartDimensions<HTMLDivElement>()

    const margins = useMemo<Margins>(
      () => ({ ...DEFAULT_MARGINS, ...props.margins }),
      [props.margins]
    )
    const seeded = useMemo(
      () => (props.seed !== undefined ? motionFromSeed(props.seed) : null),
      [props.seed]
    )
    const geo = useMemo(
      () => (props.seed !== undefined ? geometryFromSeed(props.seed) : null),
      [props.seed]
    )

    // Build the controller input as a stable object of getters so the hook's
    // `useMemo` deps recompute when props change. The getters preserve the
    // Vue kit's getter-facade shape (explicit prop > seed derivation > default).
    const input = useMemo<ControllerInput>(
      () => ({
        chartType,
        data: () => props.data,
        config: () => props.config,
        stackType: () => props.stackType ?? "default",
        dimensions: () => size,
        margins: () => margins,
        animate: () => props.animate ?? true,
        animationDuration: () =>
          props.animationDuration ?? seeded?.duration ?? 900,
        animationDelay: () => props.animationDelay ?? seeded?.delay ?? 0,
        easing: () =>
          props.easing ??
          (props.seed !== undefined
            ? easingFromSeed(props.seed)
            : chartType === "bar"
              ? "ease-out"
              : "ease-in-out"),
        sparkles: () => props.sparkles ?? true,
        hoverLift: () => props.hoverLift ?? true,
        stagger: () => props.stagger ?? seeded?.stagger ?? 0.55,
        cell: () => props.cell ?? 2,
        sparkleDensity: () => props.sparkleDensity ?? seeded?.sparkleDensity ?? 1,
        sparkleSpeed: () => props.sparkleSpeed ?? seeded?.sparkleSpeed ?? 1,
        barGap: () => props.barGap ?? geo?.barGap ?? 0.28,
        barEdge: () => props.barEdge ?? geo?.barEdge ?? 0.18,
        glowSize: () => props.glowSize ?? geo?.glowSize ?? 0.16,
        hoverStrength: () => props.hoverStrength ?? geo?.hoverStrength ?? 1,
        dimOpacity: () => props.dimOpacity ?? geo?.dimOpacity ?? 0.3,
        crosshair: () => props.crosshair ?? true,
        replayToken: () => props.replayToken ?? 0,
        markerIndex: () => props.markerIndex ?? null,
        hovered: () => props.hovered ?? false,
        bloom: () =>
          props.bloom ?? (props.seed !== undefined ? bloomFromSeed(props.seed) : "off"),
        bloomOnHover: () => props.bloomOnHover ?? false,
        precompiled: () => precompiledSrc(props.precompiled),
        seed: () => props.seed,
        effect: () => props.effect,
        defaultSelectedDataKey: props.defaultSelectedDataKey ?? null,
        onSelectionChange: props.onSelectionChange,
      }),
      // The getters read `props` and the memoized derivations, so the input
      // object is rebuilt only when those change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props, margins, seeded, geo, size]
    )

    const ctx = useChartController(input)

    const onMove = useCallback(
      (clientX: number) => {
        const node = el.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        const px = clientX - rect.left - margins.left
        const index = ctx.indexAtX(px)
        ctx.setHoverIndex(index)
        ctx.setCursorX(clientX - rect.left)
        props.onHoverChange?.(index)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ctx, margins.left, props.onHoverChange]
    )

    const onPointerEnter = useCallback(() => ctx.setMouseInChart(true), [ctx])
    const onPointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (props.interactive ?? true) onMove(e.clientX)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [onMove, props.interactive]
    )
    const onPointerLeave = useCallback(() => {
      ctx.setMouseInChart(false)
      ctx.setHoverIndex(null)
      props.onHoverChange?.(null)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx, props.onHoverChange])

    // Route slotted children by their declared layer.
    const { back, svg, dom } = useMemo(
      () => partitionChildren(props.children),
      [props.children]
    )

    const { width, height } = size
    const transform = `translate(${margins.left},${margins.top})`

    const layers: ReactNode[] = []
    if (ctx.ready && back.length > 0) {
      layers.push(
        <svg
          key="back"
          width={width}
          height={height}
          className="absolute inset-0 overflow-visible"
          aria-hidden="true"
          role="presentation"
        >
          <g transform={transform}>{back}</g>
        </svg>
      )
    }
    layers.push(<Canvas key="canvas" />)
    if (ctx.ready) {
      layers.push(
        <svg
          key="svg"
          width={width}
          height={height}
          className="absolute inset-0 overflow-visible"
          role="img"
          aria-label="Chart"
        >
          <g transform={transform}>{svg}</g>
        </svg>
      )
    }
    layers.push(...dom)

    return (
      <ChartContext.Provider value={ctx}>
        <CommonChartContext.Provider value={ctx.common}>
          <div
            ref={el}
            className={cn("relative h-full w-full", props.className)}
            onPointerEnter={onPointerEnter}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            {layers}
          </div>
        </CommonChartContext.Provider>
      </ChartContext.Provider>
    )
  }
  component.displayName = `${chartType[0].toUpperCase()}${chartType.slice(1)}Chart`
  return component
}

/**
 * Partition React children into back-canvas / front-svg / DOM layers by reading
 * each element's component `chartLayer` static property. Replaces the Vue kit's
 * `flatten` (Fragment unwrap) + `layerOf` over VNodes.
 *
 * A child targets a layer by setting a static `chartLayer` on its component:
 *   `MyGrid.chartLayer = "back"` / `MyLegend.chartLayer = "dom"`.
 * Omitting it routes to the default front SVG layer.
 */
function partitionChildren(children: ReactNode): {
  back: ReactNode[]
  svg: ReactNode[]
  dom: ReactNode[]
} {
  const back: ReactNode[] = []
  const svg: ReactNode[] = []
  const dom: ReactNode[] = []
  const walk = (nodes: ReactNode): void => {
    if (nodes == null || nodes === false) return
    if (Array.isArray(nodes)) {
      for (const n of nodes) walk(n)
      return
    }
    if (!isValidElement(nodes)) return
    const type = nodes.type as LayeredComponent
    const layer: ChartLayer =
      typeof type === "function" || typeof type === "object"
        ? (type.chartLayer ?? "svg")
        : "svg"
    if (layer === "back") back.push(nodes)
    else if (layer === "dom") dom.push(nodes)
    else svg.push(nodes)
  }
  walk(children)
  return { back, svg, dom }
}
