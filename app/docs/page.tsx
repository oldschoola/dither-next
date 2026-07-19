import { redirect } from "next/navigation";

import { SECTION_IDS } from "@/views/docs/nav-registry";

/**
 * `/docs` → `/docs/<first-section>`. The docs index redirects to the first
 * section (the "Quick start" overview). The target is `SECTION_IDS[0]`
 * (`getting-started`) — NOT `/docs/overview`, since `overview` is a pack key,
 * not a section id, and `/docs/[section]` has `dynamicParams = false`.
 */
export default function DocsIndexPage() {
  redirect(`/docs/${SECTION_IDS[0]}`);
}
