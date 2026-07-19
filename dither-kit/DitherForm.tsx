import type { FormHTMLAttributes, ReactNode } from "react"

// Semantics only: a <form> that suppresses the native validation UI and
// exposes a clean submit event. Port of DitherForm.vue — no state, so this
// stays a Server Component (no "use client").

export interface DitherFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  onSubmit?: () => void
  children?: ReactNode
}

export function DitherForm({ onSubmit, children, ...rest }: DitherFormProps) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      {...rest}
    >
      {children}
    </form>
  )
}
