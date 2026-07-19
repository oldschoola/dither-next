"use client"

import type { ScaleLinear } from "d3-scale"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { CommonChart, TooltipItem } from "./common-context"
import type { BloomInput, EasingInput, VariantInput } from "./dither-paint"
import { type DitherColor, type Seed, seedFromColor } from "./palette"
import {
  buildBandScale,
  buildXScale,
  buildYScale,
  computeBands,
  indexAtBand,
  nearestIndex,
  type StackType,
} from "./scales"
import type { Dimensions } from "./use-chart-dimensions"

/** Which chart root a part is composed under — drives the boundary guards. */
export type ChartType = "area" | "bar" | "line" | "pie" | "radar"

export type ChartConfig = Record<string, { label?: string; color: DitherColor | number | string }>

export type Margins = { top: number; right: number; bottom: number; left: number }

type Row = Record<string, unknown>

export type AreaVariant = "gradient" | "dotted" | "hatched" | "solid"
export type { TextureConfig, VariantInput } from "./dither-paint"
export type StrokeVariant = "solid" | "dashed"
export type SeriesKind = "area" | "line" | "bar"

/** What each series part (`<Area>`, `<Line>`, `<Bar>`) registers so the canvas
 *  knows which series to paint and how. */
export type SeriesSpec = {
  dataKey: string
  kind: SeriesKind
  variant: VariantInput
  strokeVariant: StrokeVariant
  opacity: number // 0–1 layer opacity, multiplied into every painted alpha
}

export type ChartContextValue = {
  chartType: ChartType
  config: ChartConfig
  configKeys: string[]
  data: Row[]
  dataLength: number
  stackType: StackType
  margins: Margins
  plot: { width: number; height: number }
  ready: boolean
  xCenter: (index: number) => number
  bandwidth: number
  indexAtX: (px: number) => number
  barSlot: (
    index: number,
    seriesIndex: number,
    seriesCount: number
  ) => { x: number; width: number }
  y: ScaleLinear<number, number>
  bands: Record<string, [number, number][]>
  max: number
  selectedDataKey: string | null
  selectDataKey: (key: string | null) => void
  focusDataKey: string | null
  setFocusDataKey: (key: string | null) => void
  hoverIndex: number | null
  setHoverIndex: (index: number | null) => void
  markerIndex: number | null
  cursorX: number
  setCursorX: (px: number) => void
  isMouseInChart: boolean
  setMouseInChart: (over: boolean) => void
  hovered: boolean
  bloom: BloomInput
  bloomOnHover: boolean
  precompiled: string | undefined
  seed: number | undefined
  effect: number | undefined
  seriesSpecs: Record<string, SeriesSpec>
  registerSeries: (spec: SeriesSpec) => void
  unregisterSeries: (dataKey: string) => void
  animate: boolean
  animationDuration: number
  animationDelay: number
  easing: EasingInput
  sparkles: boolean
  hoverLift: boolean
  stagger: number
  cell: number
  sparkleDensity: number
  sparkleSpeed: number
  barGap: number
  barEdge: number
  glowSize: number
  hoverStrength: number
  dimOpacity: number
  crosshair: boolean
  revision: number
  entranceDone: boolean
  markEntranceDone: () => void
  seedOf: (key: string) => Seed
  common: CommonChart
}

export const ChartContext = createContext<ChartContextValue | null>(null)

const ROOT_OF: Record<ChartType, string> = {
  area: "<AreaChart />",
  bar: "<BarChart />",
  line: "<LineChart />",
  pie: "<PieChart />",
  radar: "<RadarChart />",
}

/** Generic accessor for internal layers (canvas/overlay) that work for any root. */
export function useChart(): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) {
    throw new Error(
      "Chart parts must be used within a chart root (e.g. <AreaChart />)."
    )
  }
  return ctx
}

/**
 * Boundary guard for a composed part. Throws a precise error when used outside
 * a root, or inside the wrong chart type — e.g. `<Bar />` placed in an area
 * chart. `kind` omitted means the part works under any root (grid, axes, …).
 */
export function useChartPart(
  part: string,
  kind?: ChartType | ChartType[]
): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) {
    const where = kind ? ROOT_OF[Array.isArray(kind) ? kind[0] : kind] : "a chart root"
    throw new Error(`<${part} /> must be used within ${where}.`)
  }
  if (kind) {
    const allowed = Array.isArray(kind) ? kind : [kind]
    if (!allowed.includes(ctx.chartType)) {
      throw new Error(
        `<${part} /> is not valid inside ${ROOT_OF[ctx.chartType]} — it belongs in ${allowed
          .map((k) => ROOT_OF[k])
          .join(" or ")}.`
      )
    }
  }
  return ctx
}

/**
 * Reactive inputs the root feeds the controller. In the Vue kit these were
 * zero-arg getters so `computed` could track reactive deps. In React the root
 * passes already-resolved values (the root's `useMemo` deps recompute them),
 * and the controller re-derives its memoized state from this object. The
 * getter shape is preserved so the port stays structurally faithful and the
 * root can keep passing closures that read fresh props.
 */
export type ControllerInput = {
  chartType: ChartType
  data: () => Row[]
  config: () => ChartConfig
  stackType: () => StackType
  dimensions: () => Dimensions
  margins: () => Margins
  animate: () => boolean
  animationDuration: () => number
  animationDelay: () => number
  easing: () => EasingInput
  sparkles: () => boolean
  hoverLift: () => boolean
  stagger: () => number
  cell: () => number
  sparkleDensity: () => number
  sparkleSpeed: () => number
  barGap: () => number
  barEdge: () => number
  glowSize: () => number
  hoverStrength: () => number
  dimOpacity: () => number
  crosshair: () => boolean
  replayToken: () => number
  markerIndex: () => number | null
  hovered: () => boolean
  bloom: () => BloomInput
  bloomOnHover: () => boolean
  precompiled: () => string | undefined
  seed: () => number | undefined
  effect: () => number | undefined
  defaultSelectedDataKey: string | null
  onSelectionChange?: (key: string | null) => void
}

/**
 * Builds the shared chart context as a React hook. Derivations are `useMemo`,
 * interaction is `useState`, and the returned value is a memoized object whose
 * getters delegate to those values — so reading `ctx.ready` tracks via React's
 * render cycle, while the canvas RAF loop reads `state.current.configKeys` fresh
 * each frame through the `Box` the canvas component holds.
 *
 * Reactivity contract preserved from the Vue kit:
 * - `revision` bumps when data or `replayToken` changes (drives entrance replay).
 * - `entranceDone` resets to `!animate` on a revision bump.
 * - Series registration is imperative state (refs + a bump counter) so child
 *   `<Area>`/`<Line>`/`<Bar>` parts register/unregister in effects without
 *   re-rendering the root on every mount.
 */
export function useChartController(input: ControllerInput): ChartContextValue {
  const isBar = input.chartType === "bar"

  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(
    input.defaultSelectedDataKey
  )
  const [focusDataKey, setFocusDataKeyState] = useState<string | null>(null)
  const [hoverIndex, setHoverIndexState] = useState<number | null>(null)
  const [cursorX, setCursorXState] = useState(0)
  const [isMouseInChart, setMouseInChartState] = useState(false)

  // Series specs: imperative registry backed by a ref + a bump counter so
  // register/unregister from child effects don't thrash the root's render.
  // The canvas reads `seriesSpecs.current` through its `Box`, so it sees the
  // latest without a React render per registration.
  const seriesSpecsRef = useRef<Record<string, SeriesSpec>>({})
  const [seriesSpecsBump, setSeriesSpecsBump] = useState(0)
  const seriesSpecs = useMemo(
    () => seriesSpecsRef.current,
    // Re-read the ref snapshot when a registration bumped the counter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriesSpecsBump]
  )

  const registerSeries = useCallback((spec: SeriesSpec) => {
    const cur = seriesSpecsRef.current[spec.dataKey]
    if (
      cur &&
      cur.kind === spec.kind &&
      cur.variant === spec.variant &&
      cur.strokeVariant === spec.strokeVariant &&
      cur.opacity === spec.opacity
    )
      return
    seriesSpecsRef.current = { ...seriesSpecsRef.current, [spec.dataKey]: spec }
    setSeriesSpecsBump((n) => n + 1)
  }, [])
  const unregisterSeries = useCallback((dataKey: string) => {
    if (!(dataKey in seriesSpecsRef.current)) return
    const next = { ...seriesSpecsRef.current }
    delete next[dataKey]
    seriesSpecsRef.current = next
    setSeriesSpecsBump((n) => n + 1)
  }, [])

  // Resolve the current data + replayToken so revision can track them.
  const data = input.data()
  const replayToken = input.replayToken()
  const config = input.config()
  const stackType = input.stackType()

  const configKeys = useMemo(() => Object.keys(config), [config])
  const derived = useMemo(
    () => computeBands(data, configKeys, stackType),
    [data, configKeys, stackType]
  )
  const bands = useMemo(() => derived.bands, [derived])
  const max = useMemo(() => derived.max, [derived])

  const margins = input.margins()
  const dimensions = input.dimensions()

  const plotWidth = useMemo(
    () => Math.max(0, dimensions.width - margins.left - margins.right),
    [dimensions.width, margins.left, margins.right]
  )
  const plotHeight = useMemo(
    () => Math.max(0, dimensions.height - margins.top - margins.bottom),
    [dimensions.height, margins.top, margins.bottom]
  )
  const ready = plotWidth > 0 && plotHeight > 0

  const xPoint = useMemo(
    () => buildXScale(data.length, plotWidth),
    [data.length, plotWidth]
  )
  const barGap = input.barGap()
  const barEdge = input.barEdge()
  const xBand = useMemo(
    () => buildBandScale(data.length, plotWidth, barGap, barEdge),
    [data.length, plotWidth, barGap, barEdge]
  )
  const bandwidth = isBar ? xBand.bandwidth() : 0
  const y = useMemo(() => buildYScale(max, plotHeight), [max, plotHeight])

  const xCenter = useCallback(
    (i: number) =>
      isBar
        ? (xBand(i) ?? 0) + xBand.bandwidth() / 2
        : (xPoint(i) ?? 0),
    [isBar, xBand, xPoint]
  )
  const indexAtX = useCallback(
    (px: number) =>
      isBar
        ? indexAtBand(px, data.length, plotWidth)
        : nearestIndex(px, data.length, plotWidth),
    [isBar, data.length, plotWidth]
  )
  const barSlot = useCallback(
    (i: number, si: number, n: number) => {
      const center = xCenter(i)
      const st = stackType
      const stacked = st === "stacked" || st === "percent"
      const bw = bandwidth
      if (stacked) {
        const w = bw * 0.9
        return { x: center - w / 2, width: w }
      }
      const slot = bw / Math.max(n, 1)
      return { x: center - bw / 2 + si * slot + slot * 0.08, width: slot * 0.84 }
    },
    [xCenter, stackType, bandwidth]
  )

  const seedOf = useCallback(
    (key: string): Seed =>
      seedFromColor(input.config()[key]?.color ?? "grey"),
    // `config` identity changes when the consumer changes colors; the closure
    // captures the latest `config` via the input getter each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  )

  const selectDataKey = useCallback(
    (key: string | null) => {
      setSelectedDataKey(key)
      input.onSelectionChange?.(key)
    },
    // onSelectionChange is a prop callback; include it so stale closures can't
    // fire an old handler. The root passes a stable callback when it can.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.onSelectionChange]
  )
  const setFocusDataKey = useCallback((key: string | null) => {
    setFocusDataKeyState(key)
  }, [])
  const setHoverIndex = useCallback((i: number | null) => {
    setHoverIndexState(i)
  }, [])
  const setCursorX = useCallback((px: number) => {
    setCursorXState(px)
  }, [])
  const setMouseInChart = useCallback((over: boolean) => {
    setMouseInChartState(over)
  }, [])

  // revision — bumps when data or replayToken changes. Drives the canvas to
  // restart the entrance reveal.
  const dataLen = data.length
  const dataRef = useRef(data)
  dataRef.current = data
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setRevision((r) => r + 1)
  }, [data, replayToken])

  const animate = input.animate()
  const entranceDoneInitial = !animate
  const [entranceDone, setEntranceDone] = useState(entranceDoneInitial)
  // Reset entrance state when a revision bump fires (mirrors the Vue watch).
  useEffect(() => {
    setEntranceDone(!input.animate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision])
  const markEntranceDone = useCallback(() => {
    setEntranceDone(true)
  }, [])

  const animationDuration = input.animationDuration()
  const animationDelay = input.animationDelay()
  const easing = input.easing()
  const sparkles = input.sparkles()
  const hoverLift = input.hoverLift()
  const stagger = input.stagger()
  const cell = input.cell()
  const sparkleDensity = input.sparkleDensity()
  const sparkleSpeed = input.sparkleSpeed()
  const glowSize = input.glowSize()
  const hoverStrength = input.hoverStrength()
  const dimOpacity = input.dimOpacity()
  const crosshair = input.crosshair()
  const markerIndex = input.markerIndex()
  const hovered = input.hovered()
  const bloom = input.bloom()
  const bloomOnHover = input.bloomOnHover()
  const precompiled = input.precompiled()
  const seed = input.seed()
  const effect = input.effect()

  // The Legend/Tooltip surface — a getter facade over the same state.
  const common: CommonChart = useMemo(
    () => ({
      names: configKeys,
      labelOf: (n: string) => input.config()[n]?.label ?? n,
      seedOf,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      ready,
      get tooltipLeft() {
        return Math.max(
          48,
          Math.min(plotWidth + margins.left - 48, cursorX)
        )
      },
      get tooltipTop() {
        const floor = margins.top + 44
        if (hoverIndex == null) return floor
        let minY = Number.POSITIVE_INFINITY
        for (const key of configKeys) {
          const b = bands[key]?.[hoverIndex]
          if (b) minY = Math.min(minY, y(b[1]))
        }
        if (!Number.isFinite(minY)) return floor
        return Math.max(floor, margins.top + minY)
      },
      heading: (i: number, labelKey?: string) =>
        labelKey ? String(input.data()[i]?.[labelKey] ?? "") : null,
      itemsAt: (i: number): TooltipItem[] =>
        configKeys.map((name) => {
          const raw = input.data()[i]?.[name]
          const emphasis = selectedDataKey ?? focusDataKey
          return {
            name,
            label: input.config()[name]?.label ?? name,
            value: typeof raw === "number" ? raw : 0,
            seed: seedOf(name),
            dimmed: emphasis !== null && emphasis !== name,
          }
        }),
    }),
    // Re-derive when any input the getters read has changed. The getters read
    // `input` fresh, so we list the resolved values as deps to know when the
    // facade would produce different output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      configKeys,
      seedOf,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      ready,
      plotWidth,
      margins.left,
      margins.top,
      cursorX,
      bands,
      y,
    ]
  )

  // The context value — memoized so consumers only re-render when a field
  // actually changed. Getters delegate to the resolved values above, so the
  // canvas RAF loop (reading through its `Box`) always sees the latest.
  return useMemo<ChartContextValue>(
    () => ({
      chartType: input.chartType,
      config,
      configKeys,
      data,
      dataLength: dataLen,
      stackType,
      margins,
      plot: { width: plotWidth, height: plotHeight },
      ready,
      xCenter,
      bandwidth,
      indexAtX,
      barSlot,
      y,
      bands,
      max,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      markerIndex,
      cursorX,
      setCursorX,
      isMouseInChart,
      setMouseInChart,
      hovered,
      bloom,
      bloomOnHover,
      precompiled,
      seed,
      effect,
      seriesSpecs,
      registerSeries,
      unregisterSeries,
      animate,
      animationDuration,
      animationDelay,
      easing,
      sparkles,
      hoverLift,
      stagger,
      cell,
      sparkleDensity,
      sparkleSpeed,
      barGap,
      barEdge,
      glowSize,
      hoverStrength,
      dimOpacity,
      crosshair,
      revision,
      entranceDone,
      markEntranceDone,
      seedOf,
      common,
    }),
    // Every field resolved above is a dep — if any changed, the value object
    // is rebuilt so consumers (and the canvas's `Box.current`) see the update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config,
      configKeys,
      data,
      dataLen,
      stackType,
      margins,
      plotWidth,
      plotHeight,
      ready,
      xCenter,
      bandwidth,
      indexAtX,
      barSlot,
      y,
      bands,
      max,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      markerIndex,
      cursorX,
      setCursorX,
      isMouseInChart,
      setMouseInChart,
      hovered,
      bloom,
      bloomOnHover,
      precompiled,
      seed,
      effect,
      seriesSpecs,
      registerSeries,
      unregisterSeries,
      animate,
      animationDuration,
      animationDelay,
      easing,
      sparkles,
      hoverLift,
      stagger,
      cell,
      sparkleDensity,
      sparkleSpeed,
      barGap,
      barEdge,
      glowSize,
      hoverStrength,
      dimOpacity,
      crosshair,
      revision,
      entranceDone,
      markEntranceDone,
      seedOf,
      common,
    ]
  )
}
