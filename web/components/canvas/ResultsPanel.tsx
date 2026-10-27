"use client";

import { useActiveRunView } from "@/hooks/useRun";
import { ArtifactFrame } from "./ArtifactFrame";
import { groupArtifacts } from "./artifacts";
import { ChartCanvas } from "./ChartCanvas";
import { MetricCards } from "./MetricCards";
import { TableView } from "./TableView";

/** Workspace RESULTS panel: charts, metric cards and tables from the active run. */
export function ResultsPanel() {
  const view = useActiveRunView();
  const { chart, table, metric } = groupArtifacts(view?.artifacts ?? []);
  const pending = view?.status === "queued" || view?.status === "running";

  return (
    <>
      <ChartCanvas charts={chart} pending={pending} />
      <MetricCards metrics={metric} />
      {table.map((t) => (
        <ArtifactFrame key={t.seq} artifact={t}>
          <TableView table={t.payload} label={t.title || "Result table"} />
        </ArtifactFrame>
      ))}
    </>
  );
}
