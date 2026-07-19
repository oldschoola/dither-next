import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "dither-ui",
  description: "Dithered UI toolkit — Next.js port (foundation ready).",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
