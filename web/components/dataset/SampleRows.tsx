import type { DatasetProfile } from "@/lib/contract";

const MAX_ROWS = 5;

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(blank)";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** The first rows of the file exactly as loaded, before any cleaning. */
export function SampleRows({ profile }: { profile: DatasetProfile }) {
  const rows = profile.head.slice(0, MAX_ROWS);
  if (rows.length === 0) return null;
  const columns = profile.columns.map((c) => c.name);

  return (
    <details className="group rounded-xl border">
      <summary className="cursor-pointer rounded-xl px-2 py-1.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Sample rows ({rows.length})
      </summary>
      <div className="overflow-x-auto border-t" tabIndex={0} role="region" aria-label="Sample rows">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-2 py-1 font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1 whitespace-nowrap">
                    {display(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
