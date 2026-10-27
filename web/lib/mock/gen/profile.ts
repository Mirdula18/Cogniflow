import type { ColumnDtype, DatasetProfile } from "../../contract/dataset";
import type { Row } from "./files";

export interface ProfileSpec {
  id: string;
  /** Display file name, e.g. "project_delivery.csv". */
  name: string;
  columns: readonly string[];
  rows: readonly Row[];
  dtypes: Record<string, ColumnDtype>;
  /** Issue texts per column, written by the builder with counts it measured on the data. */
  issues: Record<string, string[]>;
}

const typed = (v: string | undefined, dtype: ColumnDtype): string | number | null => {
  if (v === undefined || v === "") return null;
  return dtype === "number" ? Number(v) : v;
};

/** Rows that exactly repeat an earlier row. */
export function countDuplicates(columns: readonly string[], rows: readonly Row[]): number {
  return rows.length - new Set(rows.map((r) => JSON.stringify(columns.map((c) => r[c])))).size;
}

/** Profile of the data as the agent would see it: blanks are nulls, duplicates are exact repeat rows. */
export function buildProfile({ id, name, columns, rows, dtypes, issues }: ProfileSpec): DatasetProfile & { name: string } {
  return {
    name,
    dataset_id: id,
    rows: rows.length,
    duplicates: countDuplicates(columns, rows),
    columns: columns.map((c) => {
      const dtype = dtypes[c] ?? "string";
      const values = rows.map((r) => r[c] ?? "");
      return {
        name: c,
        dtype,
        nulls: values.filter((v) => v === "").length,
        unique: new Set(values.filter((v) => v !== "")).size,
        sample: values.slice(0, 3).map((v) => typed(v, dtype)),
        issues: issues[c] ?? [],
      };
    }),
    head: rows.slice(0, 5).map((r) => Object.fromEntries(columns.map((c) => [c, typed(r[c], dtypes[c] ?? "string")]))),
  };
}
