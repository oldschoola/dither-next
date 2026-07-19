// Public API for Dither Kit (React / Next.js). Mirrors the Vue kit's surface
// for the engine + hooks; the `.vue` components become `.tsx` in later
// workstreams and are added below as they land.

// --- chart context, hooks, controllers (framework-agnostic engine + hooks) ---
export type {
  AreaVariant,
  ChartConfig,
  ChartType,
  Margins,
  SeriesKind,
  StrokeVariant,
} from "./chart-context"
export type { SeriesSpec } from "./chart-context"
export {
  ChartContext,
  useChart,
  useChartPart,
  useChartController,
  type ControllerInput,
  type ChartContextValue,
} from "./chart-context"
export { CommonChartContext, useCommonChart, type CommonChart, type TooltipItem } from "./common-context"
export { SeriesContext, useSeries, type SeriesContextValue } from "./series-context"
export type { PolarChartContextValue, PolarControllerInput } from "./polar-context"
export {
  PolarChartContext,
  usePolarChart,
  usePolarPart,
  usePolarController,
} from "./polar-context"

// --- chart roots (factories + props) ---
export { defineCartesianChart, type CartesianChartProps, type ChartCanvasComponent } from "./cartesian-root"
export {
  definePolarChart,
  type PolarChartProps,
  type PolarCanvasComponent,
  type PolarBackDecoration,
} from "./polar-root"

// --- canvas painters (framework-agnostic RAF loop + React component) ---
export { BarCanvas } from "./bar-canvas"
export { CartesianCanvas } from "./cartesian-canvas"
export { PieCanvas } from "./pie-canvas"
export { RadarCanvas } from "./radar-canvas"

// --- dither paint engine ---
export type {
  BloomBlend,
  BloomConfig,
  BloomInput,
  BloomLevel,
  BloomStyle,
  BezierPoints,
  DitherMatrix,
  EasingInput,
  EasingName,
  EdgeEffectParams,
  Glyph,
  PaintOpts,
  PaintTarget,
  SpinnerParams,
  TextureConfig,
  VariantInput,
} from "./dither-paint"
export {
  BAYER,
  CELL,
  MAX_COLS,
  MAX_ROWS,
  BORDER_ALPHA,
  OFF_TIER,
  bloomFromSeed,
  bloomLayerStyle,
  backingSize,
  colNoise,
  cubicBezier,
  easingFromSeed,
  easeInOutCubic,
  easeOutCubic,
  clamp01,
  effectFromSeed,
  EASINGS,
  geometryFromSeed,
  glyphFromSeed,
  kitFromSeed,
  matrixFromSeed,
  motionFromSeed,
  mulberry32,
  paintColumn,
  prefersReducedMotion,
  resample,
  resolveEasing,
  resolveMatrix,
  resolveTexture,
  revealFromSeed,
  sparklesFromSeed,
  spinnerFromSeed,
  SPINNER_DEFAULT,
  textureFromSeed,
} from "./dither-paint"

// --- standalone pixel engine (avatar / gradient / image) ---
export type { PixelBloom, PixelBloomConfig, PixelBloomInput, PixelBloomStyle, PixelColor } from "./pixel"
export {
  BAYER4,
  fnv1a,
  fillOf,
  hueFill,
  pixelBloomStyle,
  pixelMatrixFromSeed,
  pixelPrefersReducedMotion,
  xorshift32,
} from "./pixel"

// --- palette ---
export type { DitherColor, Rgb, Seed } from "./palette"
export {
  PALETTE,
  colorToHex,
  cssColor,
  hexToRgb,
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  isDitherColor,
  rgb,
  rgbToHex,
  rgbToHsv,
  seedFromColor,
  seedFromHex,
  seedFromHue,
  seedOfColor,
} from "./palette"

// --- raster ---
export type { RasterBuffer } from "./raster"
export {
  blendRasterPixel,
  clearRasterBuffer,
  createRasterBuffer,
  putRasterBuffer,
  setOrBlendRasterPixel,
  setRasterPixel32,
} from "./raster"

// --- scales ---
export type { StackType } from "./scales"
export {
  buildBandScale,
  buildXScale,
  buildYScale,
  computeBands,
  indexAtBand,
  nearestIndex,
} from "./scales"

// --- polar geometry ---
export type { PieSlice, RadarAxis } from "./polar"
export {
  axisAtAngle,
  distToPolygonEdge,
  pieSlices,
  pointInPolygon,
  polarX,
  polarY,
  radarAxes,
  sliceAtAngle,
} from "./polar"

// --- gesture ---
export { project, rubberband, velocityFrom, type VelocitySample } from "./gesture"

// --- avatar pattern ---
export type { AvatarPattern, SeededPattern } from "./avatar-pattern"
export {
  clampGrid,
  normalizePattern,
  patternFromImage,
  patternFromPixels,
  seededPattern,
} from "./avatar-pattern"

// --- dot paint ---
export type { DotVariant } from "./dot-paint"
export { dotPaint } from "./dot-paint"

// --- precompile (browser/SSR-safe RGBA buffers) ---
export type {
  ButtonRasterOptions,
  ButtonVariant,
  DitherRenderMode,
  GradientRasterOptions,
  GradientDirection,
  PrecompiledDither,
} from "./precompile"
export {
  DEFAULT_MAX_COLS,
  DEFAULT_MAX_ROWS,
  STATIC_DEFAULT_MAX_COLS,
  STATIC_DEFAULT_MAX_ROWS,
  precompiledSrc,
  renderDitherButton,
  renderDitherGradient,
} from "./precompile"

// --- control geometry + field context ---
export {
  CONTROL,
  CONTROL_BUTTON,
  POPOVER,
  FieldContext as FieldContextValue,
  useField,
} from "./control"

// --- toast (imperative store + hooks) ---
export { dismiss, toast, useDismiss, useToastStore, useToasts, type Toast } from "./toast"

// --- chart dimensions + visibility hooks ---
export { useChartDimensions, type Dimensions } from "./use-chart-dimensions"
export { useCanvasVisibility } from "./use-visibility"

// --- lib ---
export { cn } from "./lib"

// -------------------------------------------------------------------------
// Component exports (DitherButton, DitherGradient, DitherAvatar, DitherImage,
// Area/Line/Bar/Pie/Radar series, Grid, XAxis, YAxis, Dot, ActiveDot,
// Legend, Tooltip, Sparkline, form controls, feedback, overlays, surfaces,
// DitherToaster, …) will be added here as the `.vue` → `.tsx` port lands.
// Until a component is real, it is NOT exported — no stubs.
// -------------------------------------------------------------------------
