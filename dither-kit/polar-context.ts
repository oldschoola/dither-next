"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type {
  ChartConfig,
  ChartType,
  Margins,
} from "./chart-context"
import type { CommonChart, TooltipItem } from "./common-context"
import type { BloomInput, EasingInput, VariantInput } from "./dither-paint"
import { type Seed, seedFromColor } from "./palette"
import { type PieSlice, pieSlices, type RadarAxis, radarAxes } from "./polar"
import type { Dimensions } from "./use-chart-dimensions"

type Row = Record<string, unknown>

const ROOT_OF: Record<string, string> = {
  pie: "<PieChart />",
  radar: "<RadarChart />",
}

export type PolarChartContextValue = {
  chartType: ChartType
  config: ChartConfig
  configKeys: string[]
  data: Row[]
  dataLength: number
  ready: boolean
  plot: { width: number; height: number }
  margins: Margins
  center: { x: number; y: number }
  outerRadius: number
  innerRadius: number
  animate: boolean
  animationDuration: number
  animationDelay: number
  easing: EasingInput
  hoverLift: boolean
  cell: number
  popOut: number
  rimWidth: number
  falloff: number
  hoverStrength: number
  dimOpacity: number
  startAngle: number // degrees clockwise from 12 o'clock (pie)
  rings: number // concentric frame rings (radar)
  revision: number
  variantRevision: number
  bloom: BloomInput
  bloomOnHover: boolean
  precompiled: string | undefined
  seedOf: (key: string) => Seed
  variantOf: (key: string) => VariantInput
  registerVariant: (key: string, variant: VariantInput) => void
  unregisterVariant: (key: string) => void
  selectedDataKey: string | null
  selectDataKey: (key: string | null) => void
  focusDataKey: string | null
  setFocusDataKey: (key: string | null) => void
  hoverIndex: number | null
  setHoverIndex: (i: number | null) => void
  setCursor: (px: number, py: number) => void
  isMouseInChart: boolean
  setMouseInChart: (over: boolean) => void
  pie: PieSlice[] | null
  radar: { axes: RadarAxis[]; max: number } | null
  common: CommonChart
}

export const PolarChartContext = createContext<PolarChartContextValue | null>(null)

export function usePolarChart(): PolarChartContextValue {
  const ctx = useContext(PolarChartContext)
  if (!ctx) {
    throw new Error("Polar chart parts must be used within a polar chart root.")
  }
  return ctx
}

/** Boundary guard for polar parts (`<Pie>`, `<Radar>`). */
export function usePolarPart(
  part: string,
  kind: "pie" | "radar"
): PolarChartContextValue {
  const ctx = useContext(PolarChartContext)
  if (!ctx) {
    throw new Error(`<${part} /> must be used within ${ROOT_OF[kind]}.`)
  }
  if (ctx.chartType !== kind) {
    throw new Error(
      `<${part} /> is not valid inside ${ROOT_OF[ctx.chartType]} — it belongs in ${ROOT_OF[kind]}.`
    )
  }
  return ctx
}

export type PolarControllerInput = {
  chartType: "pie" | "radar"
  data: () => Row[]
  config: () => ChartConfig
  dataKey: () => string
  nameKey: () => string
  innerRadiusRatio: () => number
  dimensions: () => Dimensions
  margins: () => Margins
  animate: () => boolean
  animationDuration: () => number
  animationDelay: () => number
  easing: () => EasingInput
  hoverLift: () => boolean
  cell: () => number
  popOut: () => number
  rimWidth: () => number
  falloff: () => number
  hoverStrength: () => number
  dimOpacity: () => number
  startAngle: () => number
  rings: () => number
  replayToken: () => number
  bloom: () => BloomInput
  bloomOnHover: () => boolean
  precompiled: () => string | undefined
  defaultSelectedDataKey: string | null
  onSelectionChange?: (key: string | null) => void
}

/**
 * Builds the shared polar chart context as a React hook. Mirrors
 * `useChartController`'s structure: derivations via `useMemo`, interaction via
 * `useState`, stable setters via `useCallback`, and a memoized value object
 * whose getters delegate to the resolved state.
 */
export function usePolarController(
  input: PolarControllerInput
): PolarChartContextValue {
  const [selectedDataKey, setSelectedDataKey] = useState<string | null>(
    input.defaultSelectedDataKey
  )
  const [focusDataKey, setFocusDataKeyState] = useState<string | null>(null)
  const [hoverIndex, setHoverIndexState] = useState<number | null>(null)
  const [cursorX, setCursorXState] = useState(0)
  const [cursorY, setCursorYState] = useState(0)
  const [isMouseInChart, setMouseInChartState] = useState(false)

  // Variant registry: ref + bump counter (same pattern as cartesian seriesSpecs).
  const variantsRef = useRef<Record<string, VariantInput>>({})
  const [variantBump, setVariantBump] = useState(0)
  // Re-snapshot when a registration bumped the counter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const variants = useMemo(() => variantsRef.current, [variantBump])
  const variantRevision = variantBump

  const registerVariant = useCallback((key: string, variant: VariantInput) => {
    if (variantsRef.current[key] === variant) return
    variantsRef.current = { ...variantsRef.current, [key]: variant }
    setVariantBump((n) => n + 1)
  }, [])
  const unregisterVariant = useCallback((key: string) => {
    if (!(key in variantsRef.current)) return
    const next = { ...variantsRef.current }
    delete next[key]
    variantsRef.current = next
    setVariantBump((n) => n + 1)
  }, [])

  const data = input.data()
  const replayToken = input.replayToken()
  const config = input.config()

  const configKeys = useMemo(() => Object.keys(config), [config])

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
  const pad = input.chartType === "radar" ? 20 : 6
  const outerRadius = useMemo(
    () => Math.max(0, Math.min(plotWidth, plotHeight) / 2 - pad),
    [plotWidth, plotHeight, pad]
  )
  const innerRadiusRatio = input.innerRadiusRatio()
  const innerRadius = input.chartType === "pie" ? outerRadius * innerRadiusRatio : 0

  const seedOf = useCallback(
    (key: string): Seed => seedFromColor(input.config()[key]?.color ?? "grey"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  )
  const variantOf = useCallback(
    (key: string): VariantInput =>
      variantsRef.current[key] ?? variantsRef.current["*"] ?? "gradient",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variants]
  )

  const selectDataKey = useCallback(
    (key: string | null) => {
      setSelectedDataKey(key)
      input.onSelectionChange?.(key)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.onSelectionChange]
  )
  const setFocusDataKey = useCallback((key: string | null) => {
    setFocusDataKeyState(key)
  }, [])
  const setHoverIndex = useCallback((i: number | null) => {
    setHoverIndexState(i)
  }, [])
  const setCursor = useCallback((px: number, py: number) => {
    setCursorXState(px)
    setCursorYState(py)
  }, [])
  const setMouseInChart = useCallback((over: boolean) => {
    setMouseInChartState(over)
  }, [])

  // revision — bumps when data or replayToken changes.
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setRevision((r) => r + 1)
  }, [data, replayToken])

  const dataKey = input.dataKey()
  const nameKey = input.nameKey()
  const startAngle = input.startAngle()
  const pie = useMemo(
    () =>
      input.chartType === "pie"
        ? pieSlices(data, dataKey, nameKey, startAngle)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.chartType, data, dataKey, nameKey, startAngle]
  )
  const radar = useMemo(() => {
    if (input.chartType !== "radar") return null
    let max = 0
    for (const row of data) {
      for (const key of configKeys) {
        const v = Number(row[key]) || 0
        if (v > max) max = v
      }
    }
    return { axes: radarAxes(data, nameKey), max: max || 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.chartType, data, configKeys, nameKey])

  const animate = input.animate()
  const animationDuration = input.animationDuration()
  const animationDelay = input.animationDelay()
  const easing = input.easing()
  const hoverLift = input.hoverLift()
  const cell = input.cell()
  const popOut = input.popOut()
  const rimWidth = input.rimWidth()
  const falloff = input.falloff()
  const hoverStrength = input.hoverStrength()
  const dimOpacity = input.dimOpacity()
  const rings = input.rings()
  const bloom = input.bloom()
  const bloomOnHover = input.bloomOnHover()
  const precompiled = input.precompiled()
  const dataLen = data.length

  const common: CommonChart = useMemo(
    () => ({
      get names() {
        return input.chartType === "pie" && pie ? pie.map((s) => s.name) : configKeys
      },
      labelOf: (n: string) => input.config()[n]?.label ?? n,
      seedOf,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      get ready() {
        return ready
      },
      get tooltipLeft() {
        return Math.max(
          48,
          Math.min(plotWidth + margins.left - 48, cursorX)
        )
      },
      get tooltipTop() {
        return Math.max(margins.top + 44, cursorY)
      },
      heading: (i: number) =>
        input.chartType === "pie"
          ? pie?.[i]?.name ?? null
          : radar?.axes[i]?.label ?? null,
      itemsAt: (i: number): TooltipItem[] => {
        const emphasis = selectedDataKey ?? focusDataKey
        if (input.chartType === "pie") {
          const s = pie?.[i]
          if (!s) return []
          return [
            {
              name: s.name,
              label: input.config()[s.name]?.label ?? s.name,
              value: s.value,
              seed: seedOf(s.name),
              dimmed: emphasis !== null && emphasis !== s.name,
            },
          ]
        }
        return configKeys.map((name) => {
          const raw = input.data()[i]?.[name]
          return {
            name,
            label: input.config()[name]?.label ?? name,
            value: typeof raw === "number" ? raw : 0,
            seed: seedOf(name),
            dimmed: emphasis !== null && emphasis !== name,
          }
        })
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      configKeys,
      pie,
      radar,
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
      cursorY,
    ]
  )

  return useMemo<PolarChartContextValue>(
    () => ({
      chartType: input.chartType,
      config,
      configKeys,
      data,
      dataLength: dataLen,
      ready,
      plot: { width: plotWidth, height: plotHeight },
      margins,
      center: { x: plotWidth / 2, y: plotHeight / 2 },
      outerRadius,
      innerRadius,
      animate,
      animationDuration,
      animationDelay,
      easing,
      hoverLift,
      cell,
      popOut,
      rimWidth,
      falloff,
      hoverStrength,
      dimOpacity,
      startAngle,
      rings,
      revision,
      variantRevision,
      bloom,
      bloomOnHover,
      precompiled,
      seedOf,
      variantOf,
      registerVariant,
      unregisterVariant,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      setCursor,
      isMouseInChart,
      setMouseInChart,
      pie,
      radar,
      common,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config,
      configKeys,
      data,
      dataLen,
      ready,
      plotWidth,
      plotHeight,
      margins,
      outerRadius,
      innerRadius,
      animate,
      animationDuration,
      animationDelay,
      easing,
      hoverLift,
      cell,
      popOut,
      rimWidth,
      falloff,
      hoverStrength,
      dimOpacity,
      startAngle,
      rings,
      revision,
      variantRevision,
      bloom,
      bloomOnHover,
      precompiled,
      seedOf,
      variantOf,
      registerVariant,
      unregisterVariant,
      selectedDataKey,
      selectDataKey,
      focusDataKey,
      setFocusDataKey,
      hoverIndex,
      setHoverIndex,
      setCursor,
      isMouseInChart,
      setMouseInChart,
      pie,
      radar,
      common,
    ]
  )
}
