"use client"

import {
  isValidElement,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import type { ChartConfig, Margins } from "./chart-context"
import { CommonChartContext } from "./common-context"
import type { BloomInput, EasingInput } from "./dither-paint"
import { precompiledSrc, type PrecompiledDither } from "./precompile"
import { bloomFromSeed, easingFromSeed, geometryFromSeed, motionFromSeed } from "./dither-paint"
import { cn } from "./lib"
import { axisAtAngle, sliceAtAngle } from "./polar"
import {
  PolarChartContext,
  usePolarController,
  type PolarControllerInput,
} from "./polar-context"
import { useChartDimensions } from "./use-chart-dimensions"

type Row = Record<string, unknown>

const DEFAULT_POLAR_MARGINS: Margins = { top: 22, right: 14, bottom: 14, left: 14 }

/** Marker a chart part sets to declare which render layer it targets.
 *  Same contract as the cartesian root. */
export type ChartLayer = "back" | "dom" | "svg"

type LayeredComponent = {
  chartLayer?: ChartLayer
}

export type PolarChartProps = {
  data: Row[]
  config: ChartConfig
  dataKey: string
  nameKey: string
  innerRadius?: number
  margins?: Partial<Margins>
  className?: string
  animate?: boolean
  /** Master seed — derives duration, delay, easing, bloom and start angle
   *  for every prop the consumer left unset. */
  seed?: number
  animationDuration?: number
  animationDelay?: number
  easing?: EasingInput
  hoverLift?: boolean
  cell?: number
  popOut?: number
  rimWidth?: number
  falloff?: number
  hoverStrength?: number
  dimOpacity?: number
  startAngle?: number
  rings?: number
  replayToken?: number
  bloom?: BloomInput
  bloomOnHover?: boolean
  precompiled?: PrecompiledDither
  defaultSelectedDataKey?: string | null
  onSelectionChange?: (key: string | null) => void
  /** Slotted chart parts: `<Pie>`, `<Radar>`, `<Legend>`, … */
  children?: ReactNode
}

export type PolarCanvasComponent = React.ComponentType<unknown>
export type PolarBackDecoration = React.ComponentType<unknown>

/**
 * Builds a concrete polar chart component (PieChart, RadarChart) with the
 * family painter + optional back decoration baked in.
 *
 * React port of the Vue `definePolarChart` factory: instead of a
 * `defineComponent` + `setup` + render function, this returns a React
 * component that runs the polar controller hook and renders the layer
 * composition (back decoration + canvas + front svg + DOM).
 */
export function definePolarChart(
  chartType: "pie" | "radar",
  canvas: PolarCanvasComponent,
  backDecoration?: PolarBackDecoration
): React.ComponentType<PolarChartProps> {
  const Canvas = canvas
  const BackDecoration = backDecoration
  const component = function PolarChart(props: PolarChartProps) {
    const { el, size } = useChartDimensions<HTMLDivElement>()

    const margins = useMemo<Margins>(
      () => ({ ...DEFAULT_POLAR_MARGINS, ...props.margins }),
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

    const input = useMemo<PolarControllerInput>(
      () => ({
        chartType,
        data: () => props.data,
        config: () => props.config,
        dataKey: () => props.dataKey,
        nameKey: () => props.nameKey,
        innerRadiusRatio: () => props.innerRadius ?? geo?.innerRadius ?? 0,
        dimensions: () => size,
        margins: () => margins,
        animate: () => props.animate ?? true,
        animationDuration: () =>
          props.animationDuration ?? seeded?.duration ?? 900,
        animationDelay: () => props.animationDelay ?? seeded?.delay ?? 0,
        easing: () =>
          props.easing ??
          (props.seed !== undefined ? easingFromSeed(props.seed) : "ease-in-out"),
        hoverLift: () => props.hoverLift ?? true,
        cell: () => props.cell ?? 2,
        popOut: () => props.popOut ?? geo?.popOut ?? 6,
        rimWidth: () => props.rimWidth ?? geo?.rimWidth ?? 1.4,
        falloff: () => props.falloff ?? geo?.falloff ?? 0.45,
        hoverStrength: () => props.hoverStrength ?? geo?.hoverStrength ?? 1,
        dimOpacity: () => props.dimOpacity ?? geo?.dimOpacity ?? 0.3,
        startAngle: () => props.startAngle ?? seeded?.startAngle ?? 0,
        rings: () => props.rings ?? geo?.rings ?? 4,
        replayToken: () => props.replayToken ?? 0,
        bloom: () =>
          props.bloom ?? (props.seed !== undefined ? bloomFromSeed(props.seed) : "off"),
        bloomOnHover: () => props.bloomOnHover ?? false,
        precompiled: () => precompiledSrc(props.precompiled),
        defaultSelectedDataKey: props.defaultSelectedDataKey ?? null,
        onSelectionChange: props.onSelectionChange,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props, margins, seeded, geo, size]
    )

    const ctx = usePolarController(input)

    const onMove = useCallback(
      (clientX: number, clientY: number) => {
        const node = el.current
        if (!node) return
        const rect = node.getBoundingClientRect()
        const m = margins
        const dx = clientX - rect.left - m.left - ctx.center.x
        const dy = clientY - rect.top - m.top - ctx.center.y
        const angle = Math.atan2(dy, dx)
        const r = Math.hypot(dx, dy)
        if (chartType === "pie" && ctx.pie) {
          const inside = r <= ctx.outerRadius && r >= ctx.innerRadius
          const i = inside ? sliceAtAngle(ctx.pie, angle) : -1
          ctx.setHoverIndex(i >= 0 ? i : null)
        } else if (ctx.radar) {
          ctx.setHoverIndex(axisAtAngle(ctx.radar.axes, angle))
        }
        ctx.setCursor(clientX - rect.left, clientY - rect.top)
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [ctx, margins]
    )

    const onPointerEnter = useCallback(() => ctx.setMouseInChart(true), [ctx])
    const onPointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => onMove(e.clientX, e.clientY),
      [onMove]
    )
    const onPointerLeave = useCallback(() => {
      ctx.setMouseInChart(false)
      ctx.setHoverIndex(null)
    }, [ctx])

    const { back, svg, dom } = useMemo(
      () => partitionChildren(props.children),
      [props.children]
    )

    const { width, height } = size
    const transform = `translate(${margins.left},${margins.top})`

    const layers: ReactNode[] = []
    if (ctx.ready) {
      const backGroup: ReactNode[] = []
      if (BackDecoration) backGroup.push(<BackDecoration key="decoration" />)
      backGroup.push(...back)
      layers.push(
        <svg
          key="back"
          width={width}
          height={height}
          className="absolute inset-0 overflow-visible"
          aria-hidden="true"
          role="presentation"
        >
          <g transform={transform}>{backGroup}</g>
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
      <PolarChartContext.Provider value={ctx}>
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
      </PolarChartContext.Provider>
    )
  }
  component.displayName = `${chartType[0].toUpperCase()}${chartType.slice(1)}Chart`
  return component
}

/** Partition React children into back-canvas / front-svg / DOM layers by reading
 *  each element's component `chartLayer` static property. Same contract as the
 *  cartesian root. */
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
