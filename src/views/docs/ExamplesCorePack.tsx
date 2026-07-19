"use client";

import { useState } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  cssColor,
  DitherAvatar,
  DitherButton,
  DitherGradient,
  Grid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  Sparkline,
  Tooltip,
  XAxis,
} from "@dither-kit";

import { DemoCard } from "./DemoCard";
import { SNIPPETS } from "./docs-snippets";
import {
  config,
  pieConfig,
  pieRows,
  quotaConfig,
  quotaRows,
  radarConfig,
  radarRows,
  rows,
  SERVICES,
  SHELL_NAV,
  STATS,
  TEAM,
  usageConfig,
  usageRows,
} from "./docs-data";

/**
 * Examples-core pack — Dashboard, App shell, Monitoring, Team, Usage & billing,
 * Sign in.
 *
 * Port of the corresponding sections in `src/pages/docs/DocsPage.vue`
 * (template lines 980-1225). Each is a DemoCard showing a composed real-world
 * layout built entirely from kit primitives + tokens. The App shell has a
 * working nav (aria-pressed buttons driving `shellNav`).
 */
export function ExamplesCorePack() {
  const [shellNav, setShellNav] = useState<string>("Overview");

  return (
    <>
      {/* Dashboard */}
      <section id="dashboard" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Dashboard example</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Everything composed: stat cards, a stacked area, a donut — one
          palette, one texture, zero SVG.
        </p>
        <DemoCard code={SNIPPETS.dashboard}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-lg border border-border/60 p-4">
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg tracking-tight tabular-nums">{s.value}</span>
                    <span
                      className="text-[11px] tabular-nums"
                      style={{ color: cssColor(s.up ? "green" : "red") }}
                    >
                      {s.delta}
                    </span>
                  </div>
                  <Sparkline data={s.data} color={s.color} class="mt-3 h-8 w-full" />
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-4 lg:col-span-2">
                <div className="text-[11px] text-muted-foreground">Revenue vs expenses</div>
                <div className="mt-3 h-44">
                  <AreaChart data={rows} config={config} stackType="stacked">
                    <XAxis dataKey="month" maxTicks={6} />
                    <Area dataKey="expenses" variant="dotted" />
                    <Area dataKey="revenue" variant="gradient" />
                    <Tooltip labelKey="month" />
                  </AreaChart>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <div className="text-[11px] text-muted-foreground">Browser share</div>
                <div className="mt-3 h-44">
                  <PieChart
                    data={pieRows}
                    config={pieConfig}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={0.55}
                  >
                    <Pie variant="gradient" />
                  </PieChart>
                </div>
              </div>
            </div>
          </div>
        </DemoCard>
      </section>

      {/* App shell */}
      <section id="shell" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">App shell</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Sidebar, topbar, content — a whole product frame from tokens and kit
          primitives. The nav works; click around.
        </p>
        <DemoCard code={SNIPPETS.shell}>
          <div className="grid grid-cols-[150px_1fr] overflow-hidden rounded-lg border border-border/60 text-left sm:grid-cols-[170px_1fr]">
            <aside className="flex min-h-[360px] flex-col border-r border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="inline-block size-2.5 rounded-[2px] bg-foreground" />
                <span className="text-[12px] tracking-tight">dither-ui</span>
              </div>
              <nav className="mt-4 grid gap-0.5">
                {SHELL_NAV.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={shellNav === item}
                    className={`rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                      shellNav === item
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setShellNav(item)}
                  >
                    {item}
                  </button>
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-2 px-2 pt-3">
                <DitherAvatar name="ada" size={24} animate={false} />
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-foreground/90">ada</div>
                  <div className="text-[10px] text-muted-foreground">admin</div>
                </div>
              </div>
            </aside>
            <div className="flex min-w-0 flex-col">
              <header className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 px-4">
                <span className="text-[12px]">{shellNav}</span>
                <DitherButton color="blue" variant="gradient" class="px-2.5 py-1 text-[10px]">
                  Export
                </DitherButton>
              </header>
              <main className="grid flex-1 content-start gap-3 p-4">
                <div className="grid grid-cols-3 gap-3">
                  {STATS.map((s) => (
                    <div key={s.label} className="rounded-md border border-border/60 p-2.5">
                      <div className="truncate text-[10px] text-muted-foreground">{s.label}</div>
                      <div className="text-[13px] tracking-tight tabular-nums">{s.value}</div>
                      <Sparkline data={s.data} color={s.color} class="mt-1.5 h-5 w-full" />
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <div className="text-[10px] text-muted-foreground">Revenue vs expenses</div>
                  <div className="mt-2 h-36">
                    <AreaChart data={rows} config={config} stackType="stacked" interactive={false}>
                      <Area dataKey="expenses" variant="dotted" />
                      <Area dataKey="revenue" variant="gradient" />
                    </AreaChart>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </DemoCard>
      </section>

      {/* Monitoring */}
      <section id="monitoring" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Monitoring</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          An ops board: system pulse, sprint health, and per-service status rows
          — the grey seed marks what is quiet, red what is not.
        </p>
        <DemoCard code={SNIPPETS.monitoring}>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-lg border border-border/60 p-4 lg:col-span-3">
              <div className="text-[11px] text-muted-foreground">System pulse</div>
              <div className="mt-3 h-44">
                <LineChart data={rows} config={config} interactive={false}>
                  <Grid horizontal />
                  <XAxis dataKey="month" maxTicks={6} />
                  <Line dataKey="revenue" />
                  <Line dataKey="expenses" />
                </LineChart>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-4 lg:col-span-2">
              <div className="text-[11px] text-muted-foreground">Sprint health</div>
              <div className="mt-3 h-44">
                <RadarChart data={radarRows} config={radarConfig} dataKey="" nameKey="axis">
                  <Radar dataKey="current" />
                  <Radar dataKey="previous" />
                </RadarChart>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 lg:col-span-5">
              {SERVICES.map((s, i) => (
                <div
                  key={s.name}
                  className={`flex items-center gap-4 px-4 py-2.5 ${i > 0 ? "border-t border-border/40" : ""}`}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cssColor(s.ok ? "green" : "red") }}
                  />
                  <span className="w-28 truncate text-[11px] text-foreground/90 sm:w-36">
                    {s.name}
                  </span>
                  <Sparkline data={s.data} color={s.color} class="h-5 min-w-0 flex-1" />
                  <span
                    className={`w-14 text-right text-[11px] tabular-nums ${
                      s.ok ? "text-muted-foreground" : "text-foreground"
                    }`}
                    style={s.ok ? undefined : { color: cssColor("red") }}
                  >
                    {s.uptime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DemoCard>
      </section>

      {/* Team */}
      <section id="team" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Team</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Contributors panel — deterministic avatars, a commit pulse per
          person, one palette seed each.
        </p>
        <DemoCard code={SNIPPETS.team}>
          <div className="mx-auto max-w-md rounded-lg border border-border/60">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">dither-ui · contributors</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">this quarter</span>
            </div>
            {TEAM.map((m, i) => (
              <div
                key={m.name}
                className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-border/40" : ""}`}
              >
                <DitherAvatar name={m.name} size={32} animate={false} />
                <div className="w-20 min-w-0 sm:w-24">
                  <div className="truncate text-[11px] text-foreground/90">{m.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{m.role}</div>
                </div>
                <Sparkline data={m.data} color={m.color} class="h-5 min-w-0 flex-1" />
                <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                  {m.commits}
                </span>
              </div>
            ))}
          </div>
        </DemoCard>
      </section>

      {/* Usage & billing */}
      <section id="usage" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Usage &amp; billing</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Renders per month, quota as a donut, and the one button every billing
          page needs.
        </p>
        <DemoCard code={SNIPPETS.usage}>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="rounded-lg border border-border/60 p-4 sm:col-span-3">
              <div className="text-[11px] text-muted-foreground">Renders per month</div>
              <div className="mt-3 h-40">
                <BarChart data={usageRows} config={usageConfig} interactive={false}>
                  <XAxis dataKey="month" maxTicks={4} />
                  <Bar dataKey="renders" />
                </BarChart>
              </div>
            </div>
            <div className="flex flex-col rounded-lg border border-border/60 p-4 sm:col-span-2">
              <div className="text-[11px] text-muted-foreground">Quota · dither-ui pro</div>
              <div className="mt-3 h-28">
                <PieChart
                  data={quotaRows}
                  config={quotaConfig}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0.62}
                >
                  <Pie variant="gradient" />
                </PieChart>
              </div>
              <div className="mt-2 text-center text-[11px] tabular-nums text-muted-foreground">
                6.8M / 10M renders
              </div>
              <DitherButton color="blue" variant="gradient" class="mt-3 w-full py-2 text-[11px]">
                Upgrade
              </DitherButton>
            </div>
          </div>
        </DemoCard>
      </section>

      {/* Sign in */}
      <section id="signin" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Sign in</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          An auth card washed by a DitherGradient — the pixels do the
          decoration, the form stays plain.
        </p>
        <DemoCard code={SNIPPETS.signin}>
          <div className="relative isolate mx-auto max-w-xs overflow-hidden rounded-lg border border-border/60 p-7">
            <DitherGradient
              from="blue"
              to="transparent"
              direction="up"
              opacity={0.18}
              cell={4}
              renderMode="static"
              class="-z-10"
            />
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-[2px] bg-foreground" />
              <span className="text-[12px] tracking-tight">dither-ui</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Sign in to your workspace</p>
            <div className="mt-5 grid gap-2.5">
              <input
                type="email"
                name="demo-email"
                placeholder="you@dither-ui.com"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
              />
              <input
                type="password"
                name="demo-password"
                placeholder="••••••••"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
              />
              <DitherButton color="blue" variant="gradient" class="w-full py-2 text-[11px]">
                Sign in
              </DitherButton>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              No account?{" "}
              <a
                href="#/docs/signin"
                className="text-foreground/80 underline decoration-border underline-offset-2"
              >
                Request access
              </a>
            </p>
          </div>
        </DemoCard>
      </section>
    </>
  );
}
