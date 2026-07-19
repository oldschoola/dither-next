"use client";

import { useState } from "react";
import {
  cssColor,
  DitherButton,
  DitherField,
  DitherFieldset,
  DitherForm,
  DitherInput,
  DitherNumberField,
  DitherOtpField,
  DitherTextarea,
} from "@dither-kit";
import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";

const SNIPPET_INPUT = `import { DitherInput } from "@dither-kit"
import { useState } from "react"

const [name, setName] = useState("")
const [email, setEmail] = useState("not-an-email")

<div class="grid gap-3 sm:grid-cols-2">
  <DitherInput value={name} onChange={setName} placeholder="Ada Byte" />
  <DitherInput value={email} onChange={setEmail} type="email" invalid placeholder="you@dither-ui.com" />
</div>`;

const SNIPPET_TEXTAREA = `import { DitherField, DitherTextarea } from "@dither-kit"
import { useState } from "react"

const [bio, setBio] = useState("")

<DitherField label="Bio" description="A short introduction.">
  <DitherTextarea value={bio} onChange={setBio} placeholder="Tell us what you make…" />
</DitherField>`;

const SNIPPET_FIELD = `import { DitherField, DitherInput } from "@dither-kit"
import { useState } from "react"

const [handle, setHandle] = useState("")
const [website, setWebsite] = useState("")

<div class="grid gap-5">
  <DitherField label="Handle" description="Lowercase, no spaces.">
    <DitherInput value={handle} onChange={setHandle} placeholder="ada" />
  </DitherField>
  <DitherField label="Website" error="That URL does not resolve.">
    <DitherInput value={website} onChange={setWebsite} placeholder="https://" />
  </DitherField>
</div>`;

const SNIPPET_FIELDSET = `import { DitherField, DitherFieldset, DitherInput } from "@dither-kit"
import { useState } from "react"

const [name, setName] = useState("Ada Byte")
const [handle, setHandle] = useState("ada")

<DitherFieldset legend="Profile">
  <DitherField label="Name" for="profile-name">
    <DitherInput id="profile-name" value={name} onChange={setName} />
  </DitherField>
  <DitherField label="Handle" for="profile-handle">
    <DitherInput id="profile-handle" value={handle} onChange={setHandle} />
  </DitherField>
</DitherFieldset>`;

const SNIPPET_FORM = `import { DitherButton, DitherField, DitherForm, DitherInput } from "@dither-kit"
import { useState } from "react"

const [email, setEmail] = useState("")
const [submitted, setSubmitted] = useState(0)

<DitherForm onSubmit={() => setSubmitted(s => s + 1)}>
  <div class="grid gap-4">
    <DitherField label="Email" for="form-email">
      <DitherInput id="form-email" value={email} onChange={setEmail} type="email" placeholder="you@dither-ui.com" />
    </DitherField>
    <DitherButton type="submit" color="blue" class="w-full">Subscribe</DitherButton>
    <p class="text-[11px] text-muted-foreground">submitted {submitted} times</p>
  </div>
</DitherForm>`;

const SNIPPET_NUMBER = `import { DitherNumberField } from "@dither-kit"
import { useState } from "react"

const [qty, setQty] = useState(3)

<div class="flex items-center gap-4">
  <DitherNumberField value={qty} onChange={setQty} min={0} max={10} />
  <span class="text-[13px] tabular-nums">{qty} / 10</span>
</div>`;

const SNIPPET_OTP = `import { DitherOtpField } from "@dither-kit"
import { useState } from "react"

const [otp, setOtp] = useState("")
const [complete, setComplete] = useState(false)

<div class="grid gap-3">
  <DitherOtpField value={otp} onChange={setOtp} length={6} onComplete={() => setComplete(true)} />
  {complete && <p class="text-[11px]">complete!</p>}
</div>`;

const API: Record<string, PropRow[]> = {
  input: [
    { prop: "modelValue", type: "string", default: '""' },
    { prop: "type", type: "string", default: '"text"' },
    { prop: "placeholder", type: "string", default: "—" },
    { prop: "disabled / readonly / invalid", type: "boolean", default: "false" },
    { prop: "class", type: "string", default: "—" },
  ],
  textarea: [
    { prop: "modelValue", type: "string", default: '""' },
    { prop: "placeholder", type: "string", default: "—" },
    { prop: "rows", type: "number", default: "4" },
    { prop: "resize", type: '"none" | "vertical" | "horizontal" | "both"', default: '"vertical"' },
    { prop: "disabled / readonly / invalid", type: "boolean", default: "false" },
    { prop: "class", type: "string", default: "—" },
  ],
  field: [
    { prop: "label", type: "string", default: "—" },
    { prop: "description", type: "string", default: "—" },
    { prop: "error", type: "string", default: "—" },
    { prop: "for", type: "string", default: "—" },
  ],
  fieldset: [{ prop: "legend", type: "string", default: "—" }],
  form: [],
  numberField: [
    { prop: "modelValue", type: "number", default: "—" },
    { prop: "min", type: "number", default: "—" },
    { prop: "max", type: "number", default: "—" },
    { prop: "step", type: "number", default: "1" },
    { prop: "disabled", type: "boolean", default: "false" },
  ],
  otpField: [
    { prop: "length", type: "number", default: "6" },
    { prop: "modelValue", type: "string", default: '""' },
  ],
};

export function FieldDocs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("not-an-email");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("Dithered interfaces, composed with React.");
  const [website, setWebsite] = useState("");
  const [profileName, setProfileName] = useState("Ada Byte");
  const [profileHandle, setProfileHandle] = useState("ada");
  const [formEmail, setFormEmail] = useState("");
  const [submitted, setSubmitted] = useState(0);
  const [qty, setQty] = useState(3);
  const [otp, setOtp] = useState("");
  const [otpComplete, setOtpComplete] = useState(false);

  return (
    <>
      <section id="input" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Input</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A monospace text input on the token border stack — the border warms to
          the accent on focus, and <code className="text-foreground/80">invalid</code>
          swaps it for the red seed with <code className="text-foreground/80">aria-invalid</code>.
        </p>
        <DemoCard code={SNIPPET_INPUT}>
          <div className="mx-auto grid max-w-md gap-3 sm:grid-cols-2">
            <DitherInput value={name} onChange={setName} placeholder="Ada Byte" />
            <DitherInput value={email} onChange={setEmail} type="email" invalid placeholder="you@dither-ui.com" />
          </div>
        </DemoCard>
        <PropsTable rows={API.input} />
      </section>

      <section id="textarea" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Textarea</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          The multiline companion to Input, with the same field context, invalid,
          read-only, focus, and disabled contracts. Resize behavior stays explicit.
        </p>
        <DemoCard code={SNIPPET_TEXTAREA}>
          <div className="mx-auto max-w-sm">
            <DitherField label="Bio" description="A short introduction.">
              <DitherTextarea value={bio} onChange={setBio} placeholder="Tell us what you make…" />
            </DitherField>
          </div>
        </DemoCard>
        <PropsTable rows={API.textarea} />
      </section>

      <section id="field" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Field</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Label, control, and one line of small print — the
          <code className="text-foreground/80">error</code> replaces the description
          and drops a red pixel marker in front of the text.
        </p>
        <DemoCard code={SNIPPET_FIELD}>
          <div className="mx-auto grid max-w-sm gap-5">
            <DitherField label="Handle" description="Lowercase, no spaces.">
              <DitherInput value={handle} onChange={setHandle} placeholder="ada" />
            </DitherField>
            <DitherField label="Website" error="That URL does not resolve.">
              <DitherInput value={website} onChange={setWebsite} placeholder="https://" />
            </DitherField>
          </div>
        </DemoCard>
        <PropsTable rows={API.field} />
      </section>

      <section id="fieldset" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Fieldset</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Groups related fields inside a bordered box with a tracking-spaced
          legend — native <code className="text-foreground/80">&lt;fieldset&gt;</code>
          semantics, kit skin.
        </p>
        <DemoCard code={SNIPPET_FIELDSET}>
          <div className="mx-auto max-w-sm">
            <DitherFieldset legend="Profile">
              <DitherField label="Name" controlId="profile-name">
                <DitherInput id="profile-name" value={profileName} onChange={setProfileName} />
              </DitherField>
              <DitherField label="Handle" controlId="profile-handle">
                <DitherInput id="profile-handle" value={profileHandle} onChange={setProfileHandle} />
              </DitherField>
            </DitherFieldset>
          </div>
        </DemoCard>
        <PropsTable rows={API.fieldset} />
      </section>

      <section id="form" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Form</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A deliberately tiny wrapper: <code className="text-foreground/80">novalidate</code>
          suppresses the browser{'\''}s validation bubbles and submit is prevented and
          re-emitted as a clean <code className="text-foreground/80">submit</code> event.
        </p>
        <DemoCard code={SNIPPET_FORM}>
          <div className="mx-auto max-w-sm">
            <DitherForm onSubmit={() => setSubmitted((s) => s + 1)}>
              <div className="grid gap-4">
                <DitherField label="Email" controlId="form-email">
                  <DitherInput id="form-email" value={formEmail} onChange={setFormEmail} type="email" placeholder="you@dither-ui.com" />
                </DitherField>
                <DitherButton type="submit" color="blue" class="w-full">Subscribe</DitherButton>
                <p className="text-[11px] text-muted-foreground">submitted {submitted} times</p>
              </div>
            </DitherForm>
          </div>
        </DemoCard>
        <PropsTable rows={API.form} />
      </section>

      <section id="number-field" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Number Field</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Stepper buttons around a spinbutton input — arrow keys step, typed
          values clamp and snap to the step on blur, and the buttons disable at
          the bounds.
        </p>
        <DemoCard code={SNIPPET_NUMBER}>
          <div className="mx-auto flex max-w-sm items-center justify-center gap-4">
            <DitherNumberField value={qty} onChange={setQty} min={0} max={10} />
            <span className="text-[13px] tabular-nums">{qty} / 10</span>
          </div>
        </DemoCard>
        <PropsTable rows={API.numberField} />
      </section>

      <section id="otp-field" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">OTP Field</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          One box per digit with auto-advancing focus — Backspace on an empty box
          steps back, and pasting a full code distributes it across the boxes.
          <code className="text-foreground/80">complete</code> fires once every box is
          filled.
        </p>
        <DemoCard code={SNIPPET_OTP}>
          <div className="mx-auto grid max-w-sm justify-items-center gap-3">
            <DitherOtpField value={otp} onChange={setOtp} length={6} onComplete={() => setOtpComplete(true)} />
            {otpComplete ? (
              <p className="text-[11px]" style={{ color: cssColor("green") }}>
                complete!
              </p>
            ) : null}
          </div>
        </DemoCard>
        <PropsTable rows={API.otpField} />
      </section>
    </>
  );
}
