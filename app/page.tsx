export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-center font-mono text-2xl tracking-tight text-foreground">
        dither-ui<span className="text-muted-foreground"> · next</span>
      </h1>
      <p className="max-w-md text-center font-mono text-sm text-muted-foreground">
        Foundation ready. The dither-kit engine is ported; components and app
        pages arrive in later workstreams.
      </p>
    </main>
  )
}
