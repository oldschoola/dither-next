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
// NOTE: `ButtonVariant` and `GradientDirection` are exported from the
// component modules (`./DitherButton`, `./DitherGradient`) to mirror the
// Vue barrel — they are NOT re-exported here to avoid duplicate-export
// conflicts with the component files (which define the same types).
export type {
  ButtonRasterOptions,
  DitherRenderMode,
  GradientRasterOptions,
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

// =========================================================================
// Component exports — grouped to mirror the Vue `dither-kit/index.ts` barrel.
// Components are named exports (no `export default`); the Vue barrel's
// `export { default as X }` therefore maps to `export { X }` here.
// =========================================================================

// --- Charts + series parts ---
export { Area } from "./Area"
export { Line } from "./Line"
export { AreaChart, LineChart } from "./area-chart"
export { Bar } from "./Bar"
export { BarChart } from "./bar-chart"
export { Pie } from "./Pie"
export { PieChart } from "./pie-chart"
export { Radar } from "./Radar"
export { RadarChart } from "./radar-chart"
export { RadarFrame } from "./RadarFrame"
export { CartesianSeries } from "./CartesianSeries"

// --- Chart parts (axes, grid, dots, legend, tooltip, sparkline) ---
export { Grid } from "./Grid"
export { XAxis } from "./XAxis"
export { YAxis } from "./YAxis"
export { Dot } from "./Dot"
export { ActiveDot } from "./ActiveDot"
export { Legend } from "./Legend"
export { Tooltip, type TooltipVariant } from "./Tooltip"
export { Sparkline } from "./Sparkline"

// --- Standalone pixel components ---
export { DitherAvatar, type AvatarMirror } from "./DitherAvatar"
export { DitherButton, type ButtonVariant } from "./DitherButton"
export { DitherGradient, type GradientDirection } from "./DitherGradient"
export { DitherImage } from "./DitherImage"
export {
  DitherFaultyTerminal,
  type FaultyTerminalParams,
  paintFaultyTerminal,
} from "./DitherFaultyTerminal"
export { DitherSpinner } from "./DitherSpinner"

// --- Form controls ---
export { DitherSwitch } from "./DitherSwitch"
export { DitherCheckbox } from "./DitherCheckbox"
export { DitherCheckboxGroup } from "./DitherCheckboxGroup"
export { DitherSlider, type SliderVariant } from "./DitherSlider"
export { DitherProgress } from "./DitherProgress"

// --- Feedback ---
export { DitherBadge, type BadgeVariant } from "./DitherBadge"
export { DitherSkeleton } from "./DitherSkeleton"
export { DitherSeparator, type SeparatorOrientation } from "./DitherSeparator"

// --- Navigation & data ---
export { DitherBreadcrumb, type Crumb } from "./DitherBreadcrumb"
export { DitherPagination, pageList } from "./DitherPagination"
export { DitherRating } from "./DitherRating"
export { DitherStepper, type Step } from "./DitherStepper"
export { DitherTimeline, type TimelineItem } from "./DitherTimeline"

// --- Structure ---
export { DitherTabs, type TabItem, type TabsVariant } from "./DitherTabs"
export { DitherTabPanel } from "./DitherTabPanel"
export { DitherCollapsible } from "./DitherCollapsible"
export { DitherKbd } from "./DitherKbd"

// --- Overlays & menus ---
export { DitherPopover } from "./DitherPopover"
export { DitherMenu, type MenuItem } from "./DitherMenu"
export { DitherContextMenu, type ContextMenuItem } from "./DitherContextMenu"
export { DitherMenubar, type MenubarItem, type MenubarMenu } from "./DitherMenubar"
export { DitherTooltip } from "./DitherTooltip"
export { DitherPreviewCard } from "./DitherPreviewCard"
export { DitherDialog } from "./DitherDialog"
export { DitherAlertDialog } from "./DitherAlertDialog"
export { DitherDrawer, type DrawerSide } from "./DitherDrawer"
export { DitherDrawerIndent } from "./DitherDrawerIndent"
export { DitherSwipeArea } from "./DitherSwipeArea"
export { DitherAccordion, type AccordionItem } from "./DitherAccordion"
export { DitherToaster } from "./DitherToaster"
export { DitherScrollArea } from "./DitherScrollArea"

// --- Fields & forms ---
export { DitherInput } from "./DitherInput"
export { DitherTextarea } from "./DitherTextarea"
export { DitherField } from "./DitherField"
export { DitherFieldset } from "./DitherFieldset"
export { DitherForm } from "./DitherForm"
export { DitherNumberField } from "./DitherNumberField"
export { DitherOtpField } from "./DitherOtpField"

// --- Selection ---
export { DitherSelect, type Option } from "./DitherSelect"
export { DitherCombobox } from "./DitherCombobox"
export { DitherAutocomplete } from "./DitherAutocomplete"
export { DitherRadioGroup } from "./DitherRadioGroup"
export { DitherToggle } from "./DitherToggle"
export { DitherToggleGroup } from "./DitherToggleGroup"

// --- Surfaces & status ---
export {
  DitherSidebar,
  type SidebarCollapse,
  type SidebarDensity,
  type SidebarVariant,
} from "./DitherSidebar"
export { DitherSidebarItem } from "./DitherSidebarItem"
export { DitherSidebarGroup } from "./DitherSidebarGroup"
export { DitherSidebarSub } from "./DitherSidebarSub"
export { DitherNavMenu, type NavMenuItem } from "./DitherNavMenu"
export { DitherToolbar } from "./DitherToolbar"
export { DitherMeter } from "./DitherMeter"
