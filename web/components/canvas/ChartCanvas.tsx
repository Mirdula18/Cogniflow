"use client";

import { Component, useState, type ReactNode } from "react";
import { AlertCircle, BarChart3, Loader2 } from "lucide-react";
import type { ArtifactEventOfKind } from "./artifacts";
import { ArtifactFrame } from "./ArtifactFrame";
import { PlotlyChart } from "./PlotlyChart";
import { figureToTable } from "./plotTheme";
import { TableView } from "./TableView";

export interface ChartCanvasProps {
  charts: ArtifactEventOfKind<"chart">[];
  /** A run is in progress, so a chart may still arrive. */
  pending: boolean;
  highlightedSeq?: number;
}

/** UI_SPEC ChartCanvas: empty hint, loading, chart, render error. */
export function ChartCanvas({ charts, pending, highlightedSeq }: ChartCanvasProps) {
  if (charts.length === 0) {
    return pending ? (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Waiting for a chart from the analysis…
      </p>
    ) : (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart3 className="size-4" aria-hidden />
        Charts appear here when a step produces one.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {charts.map((chart) => (
        <ArtifactFrame key={chart.seq} artifact={chart} highlighted={highlightedSeq === chart.seq}>
          <ChartBody chart={chart} />
        </ArtifactFrame>
      ))}
    </div>
  );
}

function ChartBody({ chart }: { chart: ArtifactEventOfKind<"chart"> }) {
  const [plotError, setPlotError] = useState<string>();
  const table = figureToTable(chart.payload);
  const label = chart.title || "Chart";

  return (
    <>
      {plotError ? (
        <RenderError message={plotError} />
      ) : (
        <ChartErrorBoundary>
          <div role="img" aria-label={`${label}. The data is in the table below the chart.`}>
            <PlotlyChart figure={chart.payload} onError={(e) => setPlotError(e.message)} />
          </div>
        </ChartErrorBoundary>
      )}
      {table && (
        <details className="rounded-lg">
          <summary className="cursor-pointer rounded-md text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            View chart data
          </summary>
          <div className="pt-2">
            <TableView table={table} label={`${label} data`} />
          </div>
        </details>
      )}
    </>
  );
}

function RenderError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-1 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      Error: the chart could not be drawn ({message}).
    </p>
  );
}

class ChartErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <RenderError message={this.state.error.message} /> : this.props.children;
  }
}
