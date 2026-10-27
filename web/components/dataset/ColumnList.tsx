import type { ColumnProfile } from "@/lib/contract";
import { IssueChip } from "./IssueChip";

const DTYPE_LABEL: Record<ColumnProfile["dtype"], string> = {
  number: "Number",
  string: "Text",
  date: "Date",
  bool: "Yes / no",
  mixed: "Mixed",
};

/** One row per column: type, blanks, distinct values and any issues. */
export function ColumnList({ columns }: { columns: ColumnProfile[] }) {
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {columns.map((c) => (
        <li key={c.name} className="flex flex-col gap-1 p-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="font-mono text-xs font-medium break-all">{c.name}</span>
            <span className="text-xs text-muted-foreground">{DTYPE_LABEL[c.dtype]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {c.nulls} blank · {c.unique} distinct
          </p>
          {c.issues.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label={`Issues in ${c.name}`}>
              {c.issues.map((issue) => (
                <li key={issue}>
                  <IssueChip>{issue}</IssueChip>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
