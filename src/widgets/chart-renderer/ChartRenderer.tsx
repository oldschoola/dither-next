"use client";

import {
  ActiveDot,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Dot,
  Grid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "@dither-kit";
import { activeSeries, configOf, dataOf, type ChartModel } from "@/entities/chart";
import { useEditor } from "@/entities/editor";

export interface ChartRendererProps {
  chart: ChartModel;
}

/**
 * ChartRenderer — renders a chart by type using the kit's chart roots and
 * parts. Verbatim port of `src/widgets/chart-renderer/ChartRenderer.vue`.
 *
 * Each chart type passes a distinct prop set (mirroring the Vue template
 * branch-for-branch) and composes the same children: Grid / XAxis / YAxis /
 * series part (Area|Line|Bar|Radar|Pie) / Legend / Tooltip. `replayToken`
 * from the editor store drives animation re-runs (guide §11).
 */
export function ChartRenderer({ chart }: ChartRendererProps) {
  const rt = useEditor((s) => s.replayToken);
  const data = dataOf(chart);
  const cfg = configOf(chart);
  const series = activeSeries(chart);

  if (chart.type === "area") {
    return (
      <AreaChart
        data={data}
        config={cfg}
        margins={chart.margins}
        bloom={chart.bloom}
        seed={chart.seed}
        effect={chart.effect}
        stackType={chart.stackType}
        animate={chart.animate}
        interactive={chart.interactive}
        animationDuration={chart.animationDuration}
        animationDelay={chart.animationDelay}
        easing={chart.easing}
        sparkles={chart.sparkles}
        hoverLift={chart.hoverLift}
        cell={chart.cell}
        sparkleDensity={chart.sparkleDensity}
        sparkleSpeed={chart.sparkleSpeed}
        hoverStrength={chart.hoverStrength}
        dimOpacity={chart.dimOpacity}
        crosshair={chart.crosshair}
        replayToken={rt}
      >
        {chart.grid.on ? (
          <Grid
            horizontal={chart.grid.horizontal}
            vertical={chart.grid.vertical}
            strokeDasharray={chart.grid.dash}
            tickCount={chart.grid.tickCount}
          />
        ) : null}
        {chart.xAxis.on ? (
          <XAxis
            dataKey="month"
            tickMargin={chart.xAxis.tickMargin}
            maxTicks={chart.xAxis.maxTicks}
          />
        ) : null}
        {chart.yAxis.on ? (
          <YAxis tickCount={chart.yAxis.tickCount} tickMargin={chart.yAxis.tickMargin} />
        ) : null}
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            variant={s.variant}
            isClickable={s.isClickable}
            opacity={s.opacity}
          >
            {s.dots.on ? <Dot variant={s.dots.variant} r={s.dots.r} /> : null}
            {s.activeDot.on ? <ActiveDot variant={s.activeDot.variant} r={s.activeDot.r} /> : null}
          </Area>
        ))}
        {chart.legend.on ? (
          <Legend align={chart.legend.align} isClickable={chart.legend.clickable} />
        ) : null}
        {chart.tooltip.on ? <Tooltip labelKey="month" variant={chart.tooltip.variant} /> : null}
      </AreaChart>
    );
  }

  if (chart.type === "line") {
    return (
      <LineChart
        data={data}
        config={cfg}
        margins={chart.margins}
        bloom={chart.bloom}
        seed={chart.seed}
        effect={chart.effect}
        animate={chart.animate}
        interactive={chart.interactive}
        animationDuration={chart.animationDuration}
        animationDelay={chart.animationDelay}
        easing={chart.easing}
        sparkles={chart.sparkles}
        hoverLift={chart.hoverLift}
        cell={chart.cell}
        sparkleDensity={chart.sparkleDensity}
        sparkleSpeed={chart.sparkleSpeed}
        glowSize={chart.glowSize}
        hoverStrength={chart.hoverStrength}
        dimOpacity={chart.dimOpacity}
        crosshair={chart.crosshair}
        replayToken={rt}
      >
        {chart.grid.on ? (
          <Grid
            horizontal={chart.grid.horizontal}
            vertical={chart.grid.vertical}
            strokeDasharray={chart.grid.dash}
            tickCount={chart.grid.tickCount}
          />
        ) : null}
        {chart.xAxis.on ? (
          <XAxis
            dataKey="month"
            tickMargin={chart.xAxis.tickMargin}
            maxTicks={chart.xAxis.maxTicks}
          />
        ) : null}
        {chart.yAxis.on ? (
          <YAxis tickCount={chart.yAxis.tickCount} tickMargin={chart.yAxis.tickMargin} />
        ) : null}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            isClickable={s.isClickable}
            opacity={s.opacity}
          >
            {s.dots.on ? <Dot variant={s.dots.variant} r={s.dots.r} /> : null}
            {s.activeDot.on ? <ActiveDot variant={s.activeDot.variant} r={s.activeDot.r} /> : null}
          </Line>
        ))}
        {chart.legend.on ? (
          <Legend align={chart.legend.align} isClickable={chart.legend.clickable} />
        ) : null}
        {chart.tooltip.on ? <Tooltip labelKey="month" variant={chart.tooltip.variant} /> : null}
      </LineChart>
    );
  }

  if (chart.type === "bar") {
    return (
      <BarChart
        data={data}
        config={cfg}
        margins={chart.margins}
        bloom={chart.bloom}
        seed={chart.seed}
        stackType={chart.stackType}
        animate={chart.animate}
        interactive={chart.interactive}
        animationDuration={chart.animationDuration}
        animationDelay={chart.animationDelay}
        easing={chart.easing}
        hoverLift={chart.hoverLift}
        stagger={chart.stagger}
        cell={chart.cell}
        barGap={chart.barGap}
        barEdge={chart.barEdge}
        hoverStrength={chart.hoverStrength}
        dimOpacity={chart.dimOpacity}
        crosshair={chart.crosshair}
        replayToken={rt}
      >
        {chart.grid.on ? (
          <Grid
            horizontal={chart.grid.horizontal}
            vertical={chart.grid.vertical}
            strokeDasharray={chart.grid.dash}
            tickCount={chart.grid.tickCount}
          />
        ) : null}
        {chart.xAxis.on ? (
          <XAxis
            dataKey="month"
            tickMargin={chart.xAxis.tickMargin}
            maxTicks={chart.xAxis.maxTicks}
          />
        ) : null}
        {chart.yAxis.on ? (
          <YAxis tickCount={chart.yAxis.tickCount} tickMargin={chart.yAxis.tickMargin} />
        ) : null}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            variant={s.variant}
            isClickable={s.isClickable}
            opacity={s.opacity}
          >
            {s.dots.on ? <Dot variant={s.dots.variant} r={s.dots.r} /> : null}
            {s.activeDot.on ? <ActiveDot variant={s.activeDot.variant} r={s.activeDot.r} /> : null}
          </Bar>
        ))}
        {chart.legend.on ? (
          <Legend align={chart.legend.align} isClickable={chart.legend.clickable} />
        ) : null}
        {chart.tooltip.on ? <Tooltip labelKey="month" variant={chart.tooltip.variant} /> : null}
      </BarChart>
    );
  }

  if (chart.type === "pie") {
    return (
      <PieChart
        data={data}
        config={cfg}
        dataKey="value"
        nameKey="name"
        innerRadius={chart.innerRadius}
        bloom={chart.bloom}
        seed={chart.seed}
        animate={chart.animate}
        animationDuration={chart.animationDuration}
        animationDelay={chart.animationDelay}
        easing={chart.easing}
        hoverLift={chart.hoverLift}
        cell={chart.cell}
        popOut={chart.popOut}
        rimWidth={chart.rimWidth}
        hoverStrength={chart.hoverStrength}
        dimOpacity={chart.dimOpacity}
        startAngle={chart.startAngle}
        replayToken={rt}
      >
        <Pie variant={chart.series[0]?.variant ?? "gradient"} />
        {chart.legend.on ? (
          <Legend align={chart.legend.align} isClickable={chart.legend.clickable} />
        ) : null}
        {chart.tooltip.on ? <Tooltip variant={chart.tooltip.variant} /> : null}
      </PieChart>
    );
  }

  // radar (default branch — Vue `v-else`). The React kit's PolarChartProps
  // makes `dataKey` required (the pie value field); Radar ignores it, but
  // the typed port must satisfy the shared polar root's contract. The Vue
  // template omits it — `dataKey="axis"` is a harmless placeholder.
  return (
    <RadarChart
      data={data}
      config={cfg}
      dataKey="axis"
      nameKey="axis"
      animate={chart.animate}
      animationDuration={chart.animationDuration}
      animationDelay={chart.animationDelay}
      easing={chart.easing}
      hoverLift={chart.hoverLift}
      cell={chart.cell}
      falloff={chart.falloff}
      hoverStrength={chart.hoverStrength}
      dimOpacity={chart.dimOpacity}
      rings={chart.radarRings}
      replayToken={rt}
    >
      {series.map((s) => (
        <Radar key={s.key} dataKey={s.key} variant={s.variant} />
      ))}
      {chart.legend.on ? (
        <Legend align={chart.legend.align} isClickable={chart.legend.clickable} />
      ) : null}
      {chart.tooltip.on ? <Tooltip variant={chart.tooltip.variant} /> : null}
    </RadarChart>
  );
}
