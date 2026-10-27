import type { Cell, TablePayload } from "@/lib/contract";
import { cn } from "@/lib/utils";

export interface TableViewProps {
  table: TablePayload;
  /** Accessible name for the scrollable region. */
  label: string;
  /** Row/column of a cell to mark as the source of a summary number. */
  highlight?: { row: number; col: number };
}

const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });

function display(cell: Cell): string {
  if (cell === null || cell === "") return "(blank)";
  if (typeof cell === "number") return formatter.format(cell);
  if (typeof cell === "boolean") return cell ? "Yes" : "No";
  return cell;
}

/** Contract table artifact (≤ 100 rows). Numbers are right-aligned in tabular figures. */
export function TableView({ table, label, highlight }: TableViewProps) {
  const numeric = table.columns.map((_, c) => table.rows.some((r) => typeof r[c] === "number"));

  return (
    <div className="max-h-80 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-muted">
          <tr>
            {table.columns.map((col, c) => (
              <th key={col} scope="col" className={cn("px-2 py-1.5 font-medium", numeric[c] ? "text-right" : "text-left")}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-t">
              {row.map((cell, c) => {
                const marked = highlight?.row === r && highlight.col === c;
                return (
                  <td
                    key={c}
                    data-highlighted={marked || undefined}
                    className={cn(
                      "px-2 py-1",
                      numeric[c] && "text-right font-mono tabular-nums",
                      marked && "bg-primary/15 font-semibold outline-2 outline-primary",
                    )}
                  >
                    {display(cell)}
                    {marked && <span className="sr-only"> (source of selected number)</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
