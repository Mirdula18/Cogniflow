import type { Cell, ChartPayload, TablePayload } from "@/lib/contract";

const toCell = (v: unknown): Cell =>
  v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : String(v);

/**
 * The figure's x/y traces as a table, so every chart has a non-visual view.
 * Undefined when a trace is not a plain x/y series (e.g. pie, heatmap).
 */
export function figureToTable(payload: ChartPayload): TablePayload | undefined {
  const series: { name: string; x: unknown[]; y: unknown[] }[] = [];
  for (const [i, trace] of payload.data.entries()) {
    const { x, y, name } = trace;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return undefined;
    series.push({ name: typeof name === "string" && name ? name : `Series ${i + 1}`, x, y });
  }
  if (series.length === 0) return undefined;

  const xAxis = payload.layout?.xaxis as { title?: { text?: unknown } | string } | undefined;
  const title = typeof xAxis?.title === "string" ? xAxis.title : xAxis?.title?.text;
  const keys: unknown[] = [];
  const byKey = new Map<unknown, Cell[]>();
  series.forEach((s, col) =>
    s.x.forEach((x, i) => {
      if (!byKey.has(x)) {
        keys.push(x);
        byKey.set(x, series.map(() => null));
      }
      const row = byKey.get(x);
      if (row) row[col] = toCell(s.y[i]);
    }),
  );
  const rows = keys.slice(0, 100).map((k) => [toCell(k), ...(byKey.get(k) ?? [])]);
  return { columns: [typeof title === "string" && title ? title : "Category", ...series.map((s) => s.name)], rows };
}
