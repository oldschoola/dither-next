"use client";

import type { PackKey } from "./nav-registry";

import { OverviewPack } from "./OverviewPack";
import { HandbookPack } from "./HandbookPack";
import { ExamplesCorePack } from "./ExamplesCorePack";
import { AuthExamples } from "./examples/AuthExamples";
import { ProductExamples } from "./examples/ProductExamples";
import { ChartsDocs } from "./components/ChartsDocs";
import { FormDocs } from "./components/FormDocs";
import { FieldDocs } from "./components/FieldDocs";
import { SelectionDocs } from "./components/SelectionDocs";
import { FeedbackDocs } from "./components/FeedbackDocs";
import { StructureDocs } from "./components/StructureDocs";
import { OverlayDocs } from "./components/OverlayDocs";
import { SurfaceDocs } from "./components/SurfaceDocs";
import { NavigationDocs } from "./components/NavigationDocs";

/**
 * SectionContent — renders the section pack for a given pack key.
 *
 * The Vue docs was one long page; the Next.js port routes each section to its
 * own URL but keeps the pack grouping so a reader scanning a group sees its
 * siblings. Each pack is a self-contained component (sections + snippets +
 * local state), matching the Vue `*-nav.ts` + pack shape (docs/AGENTS.md).
 */
export function SectionContent({ pack }: { pack: PackKey }) {
  switch (pack) {
    case "overview":
      return <OverviewPack />;
    case "handbook":
      return <HandbookPack />;
    case "examples-core":
      return <ExamplesCorePack />;
    case "examples-auth":
      return <AuthExamples />;
    case "examples-product":
      return <ProductExamples />;
    case "components-charts":
      return <ChartsDocs />;
    case "components-form":
      return <FormDocs />;
    case "components-field":
      return <FieldDocs />;
    case "components-selection":
      return <SelectionDocs />;
    case "components-feedback":
      return <FeedbackDocs />;
    case "components-structure":
      return <StructureDocs />;
    case "components-overlay":
      return <OverlayDocs />;
    case "components-surface":
      return <SurfaceDocs />;
    case "components-navigation":
      return <NavigationDocs />;
  }
}
