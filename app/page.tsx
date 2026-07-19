import type { Metadata } from "next";
import { LandingPage } from "@/views/landing";

/**
 * Landing route — `/`. A Server Component shell that exports the page
 * metadata and renders the landing module (which is a client component only
 * because it performs a one-shot canvas blit on mount; everything else is
 * CSS-driven — see `src/pages/landing/LandingPage.tsx`).
 *
 * Port of the Vue `/#/` route (guide §11). The appshell `app/layout.tsx`
 * already exports a default `metadata`; this route-level export overrides
 * the title/description/openGraph for the landing specifically.
 */
export const metadata: Metadata = {
  title: "dither-ui — A dithered UI toolkit for React",
  description:
    "dither-ui is a React 19 / Next.js 15 UI toolkit rendered on one ordered-dither canvas engine: composable area, line, bar, pie and radar charts plus 55 Base UI-parity components — buttons, avatars, gradients, forms, overlays — all seed-generative. MIT licensed.",
  openGraph: {
    type: "website",
    siteName: "dither-ui",
    title: "dither-ui — A dithered UI toolkit for React",
    description:
      "Composable dithered charts and 55 seed-generative React components on one ordered-dither canvas engine. MIT licensed.",
    url: "https://dither-ui.com/",
    images: [
      {
        url: "https://dither-ui.com/og.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "dither-ui wordmark over a dithered blue and purple area-chart horizon",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "dither-ui — A dithered UI toolkit for React",
    description:
      "Composable dithered charts and 55 seed-generative React components on one ordered-dither canvas engine. MIT licensed.",
    images: ["https://dither-ui.com/og.png"],
  },
  alternates: {
    canonical: "https://dither-ui.com/",
  },
};

export default function Page() {
  return <LandingPage />;
}
