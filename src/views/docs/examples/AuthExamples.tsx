"use client";

import { useRef, useState } from "react";

import { DitherButton, DitherGradient } from "@dither-kit";

import { DemoCard } from "../DemoCard";

/**
 * AuthExamples — signup / magic-link / twofactor section pack.
 * Port of `src/pages/docs/examples/AuthExamples.vue`.
 *
 * One React component rendering a fragment of sections, matching the Vue
 * `<template>` (which is itself a fragment). Section ids, classes, prose, and
 * the SNIPPET_* code strings are ported verbatim from the Vue source. The
 * SNIPPET_* strings show React/TSX usage of the kit — the code tab
 * documents the React API the demo renders.
 *
 * State mapping (guide §4): `reactive({ plan })` → one `useState` object
 * updated via a setter that spreads the previous value; `ref(false)` / `ref("")`
 * → `useState`; `v-model` → `value` + `onChange`; `@click` → `onClick`;
 * `:aria-pressed` → `aria-pressed`. The two-factor code inputs use a ref array
 * with auto-advancing focus, mirroring the Vue `ref="codeInputs"` template ref
 * on a `v-for`.
 */
const PLANS = ["Free", "Pro", "Scale"] as const;

const SNIPPET_SIGNUP = `<div className="relative overflow-hidden rounded-lg border p-7">
  <DitherGradient from="purple" direction="up" opacity={0.16} />
  <span>dither-ui</span>                    {/* wordmark */}
  <input name="signup-name" placeholder="Ada Byte" />
  <input name="signup-email" placeholder="you@dither-ui.com" />
  <input type="password" placeholder="••••••••" />
  <div role="group">                        {/* plan picker */}
    {plans.map(p => (
      <button key={p} aria-pressed={plan === p}
        onClick={() => setPlan(p)}>{p}</button>
    ))}
  </div>
  <DitherButton color="purple" class="w-full">Create account</DitherButton>
</div>`;

const SNIPPET_MAGIC = `<div className="relative overflow-hidden rounded-lg border p-7">
  <DitherGradient from="green" direction="up" opacity={0.14} />
  <span>dither-ui</span>                    {/* wordmark */}
  {!sent ? (
    <>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@dither-ui.com" />
      <DitherButton color="green" class="w-full" onClick={() => setSent(true)}>
        Send magic link
      </DitherButton>
    </>
  ) : (
    <>
      <span>✓</span> Check your inbox — {email}
      <button onClick={() => setSent(false)}>use a different email</button>
    </>
  )}
</div>`;

const SNIPPET_TWOFACTOR = `<div className="relative overflow-hidden rounded-lg border p-7">
  <DitherGradient from="blue" direction="up" opacity={0.14} />
  <span>dither-ui</span>                    {/* wordmark */}
  <div className="flex gap-2">                  {/* code inputs */}
    {Array.from({ length: 6 }, (_, i) => (
      <input key={i} maxLength={1} inputMode="numeric"
        className="w-9 h-11 text-center" onInput={() => focusNext(i)} />
    ))}
  </div>
  <DitherButton color="blue" class="w-full">Verify</DitherButton>
  <button>resend in 24s</button>
</div>`;

export function AuthExamples() {
  // --- signup: plan picker drives signup.plan ---
  const [signup, setSignup] = useState<{ plan: (typeof PLANS)[number] }>({
    plan: "Free",
  });

  // --- magic-link: form / sent two states ---
  const [magicEmail, setMagicEmail] = useState("");
  const [sent, setSent] = useState(false);

  // --- twofactor: 6 code inputs with auto-advancing focus ---
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);
  function onCodeInput(i: number) {
    const el = codeInputs.current[i];
    if (el?.value && i < 5) codeInputs.current[i + 1]?.focus();
  }

  return (
    <>
      <section id="signup" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Sign up</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A signup card with a working plan picker — segmented control from plain
          aria-pressed buttons, purple wash behind.
        </p>
        <DemoCard code={SNIPPET_SIGNUP}>
          <div className="relative isolate mx-auto max-w-xs overflow-hidden rounded-lg border border-border/60 p-7">
            <DitherGradient
              from="purple"
              to="transparent"
              direction="up"
              opacity={0.16}
              cell={4}
              renderMode="static"
              class="-z-10"
            />
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-[2px] bg-foreground" />
              <span className="text-[12px] tracking-tight">dither-ui</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Create your workspace</p>
            <div className="mt-5 grid gap-2.5">
              <input
                type="text"
                name="signup-name"
                placeholder="Ada Byte"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
              />
              <input
                type="email"
                name="signup-email"
                placeholder="you@dither-ui.com"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
              />
              <input
                type="password"
                name="signup-password"
                placeholder="••••••••"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
              />
              <div
                className="grid grid-cols-3 gap-1 rounded-md border border-border/60 p-1"
                role="group"
                aria-label="Plan"
              >
                {PLANS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={signup.plan === p}
                    className={`rounded px-2 py-1 text-[11px] transition-colors ${
                      signup.plan === p
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setSignup((prev) => ({ ...prev, plan: p }))}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <DitherButton color="purple" variant="gradient" class="w-full py-2 text-[11px]">
                Create account
              </DitherButton>
            </div>
          </div>
        </DemoCard>
      </section>

      <section id="magic-link" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Magic link</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Passwordless in two states — send the link, then echo the address back
          with a pixel checkmark. Green wash, green button.
        </p>
        <DemoCard code={SNIPPET_MAGIC}>
          <div className="relative isolate mx-auto max-w-xs overflow-hidden rounded-lg border border-border/60 p-7">
            <DitherGradient
              from="green"
              to="transparent"
              direction="up"
              opacity={0.14}
              cell={4}
              renderMode="static"
              class="-z-10"
            />
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-[2px] bg-foreground" />
              <span className="text-[12px] tracking-tight">dither-ui</span>
            </div>
            {!sent ? (
              <>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Sign in without a password
                </p>
                <div className="mt-5 grid gap-2.5">
                  <input
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    type="email"
                    name="magic-email"
                    placeholder="you@dither-ui.com"
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent/60"
                  />
                  <DitherButton
                    color="green"
                    variant="gradient"
                    class="w-full py-2 text-[11px]"
                    onClick={() => setSent(true)}
                  >
                    Send magic link
                  </DitherButton>
                </div>
              </>
            ) : (
              <div className="mt-5 text-center">
                <span className="inline-block" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 10 10"
                    className="text-foreground"
                    shape-rendering="crispEdges"
                  >
                    <path
                      d="M1 5h1v1H1zM2 6h1v1H2zM3 7h1v1H3zM4 6h1v1H4zM5 5h1v1H5zM6 4h1v1H6zM7 3h1v1H7zM8 2h1v1H8z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <p className="mt-2 text-[12px] tracking-tight">Check your inbox</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  We sent a link to {magicEmail || "your email"}
                </p>
                <button
                  type="button"
                  className="mt-4 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setSent(false);
                    setMagicEmail("");
                  }}
                >
                  use a different email
                </button>
              </div>
            )}
          </div>
        </DemoCard>
      </section>

      <section id="twofactor" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Two-factor</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Six code cells with auto-advancing focus — plain inputs, token borders,
          blue wash behind.
        </p>
        <DemoCard code={SNIPPET_TWOFACTOR}>
          <div className="relative isolate mx-auto max-w-xs overflow-hidden rounded-lg border border-border/60 p-7">
            <DitherGradient
              from="blue"
              to="transparent"
              direction="up"
              opacity={0.14}
              cell={4}
              renderMode="static"
              class="-z-10"
            />
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-[2px] bg-foreground" />
              <span className="text-[12px] tracking-tight">dither-ui</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Enter the code from your authenticator
            </p>
            <div className="mt-5 grid gap-2.5">
              <div
                className="flex justify-between gap-2"
                role="group"
                aria-label="Verification code"
              >
                {Array.from({ length: 6 }, (_, k) => {
                  const i = k + 1;
                  return (
                    <input
                      key={i}
                      ref={(el) => {
                        codeInputs.current[k] = el;
                      }}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      name={`twofactor-digit-${i}`}
                      autoComplete="off"
                      aria-label={`Digit ${i}`}
                      className="h-11 w-9 rounded-md border border-border bg-background/60 text-center text-[13px] text-foreground outline-none focus:border-accent/60"
                      onInput={() => onCodeInput(k)}
                    />
                  );
                })}
              </div>
              <DitherButton color="blue" variant="gradient" class="w-full py-2 text-[11px]">
                Verify
              </DitherButton>
            </div>
            <p className="mt-4 text-center">
              <button
                type="button"
                className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                resend in 24s
              </button>
            </p>
          </div>
        </DemoCard>
      </section>
    </>
  );
}
