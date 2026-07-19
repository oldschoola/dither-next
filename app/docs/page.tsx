import { redirect } from "next/navigation";

/**
 * `/docs` → `/docs/overview`. The docs index redirects to the first section
 * (the "Quick start" overview), matching the Vue docs entrypoint.
 */
export default function DocsIndexPage() {
  redirect("/docs/overview");
}
