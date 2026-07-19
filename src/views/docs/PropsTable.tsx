/**
 * PropsTable — a prop reference table. Port of `src/pages/docs/PropsTable.vue`.
 *
 * A pure render (Server Component safe). `PropRow` mirrors the Vue type so
 * section packs can share one API-table shape.
 */
export type PropRow = { prop: string; type: string; default: string };

export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-border/60 text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Prop</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Default</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.prop} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-2.5 whitespace-nowrap text-foreground/90">{r.prop}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.type}</td>
              <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{r.default}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
