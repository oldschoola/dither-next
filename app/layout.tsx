import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./AppProviders";

/**
 * Root layout — app shell (guide §11).
 *
 * Port of `src/app/App.vue`: the Vue app mounted a single root and swapped
 * page components by hash route. In Next.js the App Router owns routing; this
 * layout mounts the cross-cutting providers via the client `<AppProviders>`
 * wrapper (the kit providers use hooks and must be client components, while
 * this layout stays a Server Component so it can export `metadata`).
 *
 * `:focus-visible` global ring is preserved in `globals.css` (NOT suppressed).
 */
export const metadata: Metadata = {
  title: {
    default: "dither-ui — A dithered UI toolkit for React",
    template: "%s | dither-ui",
  },
  description:
    "A dithered UI toolkit for React 19 / Next.js 15 — dithered buttons, charts, and pixel-art components.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
