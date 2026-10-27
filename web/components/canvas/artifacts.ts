import type { ArtifactEvent } from "@/lib/contract";

export type ArtifactKind = ArtifactEvent["kind"];
export type ArtifactEventOfKind<K extends ArtifactKind> = Extract<ArtifactEvent, { kind: K }>;

export interface ArtifactsByKind {
  chart: ArtifactEventOfKind<"chart">[];
  table: ArtifactEventOfKind<"table">[];
  metric: ArtifactEventOfKind<"metric">[];
}

/** Splits a run's artifacts by kind, keeping event order. */
export function groupArtifacts(artifacts: readonly ArtifactEvent[]): ArtifactsByKind {
  const groups: ArtifactsByKind = { chart: [], table: [], metric: [] };
  for (const a of artifacts) {
    if (a.kind === "chart") groups.chart.push(a);
    else if (a.kind === "table") groups.table.push(a);
    else groups.metric.push(a);
  }
  return groups;
}
