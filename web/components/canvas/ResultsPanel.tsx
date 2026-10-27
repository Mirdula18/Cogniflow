"use client";

import { useState } from "react";
import { FindingsPanel } from "@/components/findings/FindingsPanel";
import { useActiveRunView } from "@/hooks/useRun";
import type { ArtifactEvent } from "@/lib/contract";
import { groupArtifacts } from "@/lib/findings/artifacts";
import type { NumberSource } from "@/lib/findings/numbers";
import { ArtifactFrame, artifactDomId } from "./ArtifactFrame";
import { ChartCanvas } from "./ChartCanvas";
import { MetricCards } from "./MetricCards";
import { TableView } from "./TableView";

interface Selection {
  runId: string;
  key: string;
  source: NumberSource;
}

function describe(source: NumberSource, artifacts: readonly ArtifactEvent[]): string {
  const title = artifacts.find((a) => a.seq === source.seq)?.title || "result";
  return source.kind === "metric" ? `Source: ${title}.` : `Source: ${title}, row ${source.row + 1}, column ${source.col + 1}.`;
}

/** Workspace RESULTS panel: charts, metric cards, tables and the findings summary for the active run. */
export function ResultsPanel() {
  const view = useActiveRunView();
  const [selection, setSelection] = useState<Selection>();
  const artifacts = view?.artifacts ?? [];
  const { chart, table, metric } = groupArtifacts(artifacts);
  const pending = view?.status === "queued" || view?.status === "running";
  // A selection belongs to one run; switching runs drops it.
  const active = selection && selection.runId === view?.runId ? selection : undefined;
  const highlight = active?.source;

  const select = (key: string, source: NumberSource) => {
    if (!view) return;
    if (active?.key === key) return setSelection(undefined);
    setSelection({ runId: view.runId, key, source });
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      document
        .getElementById(artifactDomId(source))
        ?.scrollIntoView?.({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" }),
    );
  };

  return (
    <>
      <ChartCanvas charts={chart} pending={pending} highlight={highlight} />
      <MetricCards metrics={metric} highlightedSeq={highlight?.kind === "metric" ? highlight.seq : undefined} />
      {table.map((t) => {
        const marked = highlight?.seq === t.seq && highlight.kind === "table" ? highlight : undefined;
        return (
          <ArtifactFrame key={t.seq} artifact={t} highlighted={Boolean(marked)}>
            <TableView table={t.payload} label={t.title || "Result table"} highlight={marked} />
          </ArtifactFrame>
        );
      })}
      <FindingsPanel view={view} selectedKey={active?.key} onSelect={select} />
      <p role="status" aria-live="polite" className="sr-only">
        {highlight ? describe(highlight, artifacts) : ""}
      </p>
    </>
  );
}
