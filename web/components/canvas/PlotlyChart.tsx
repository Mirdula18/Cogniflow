"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { ChartPayload } from "@/lib/contract";
import { useIsDarkTheme } from "@/hooks/useIsDarkTheme";
import { PLOT_CONFIG, themedLayout } from "./plotTheme";

/** Plotly touches `window`, so it is loaded on the client only, on first chart. */
const Plot = dynamic(
  async () => {
    const [{ default: Plotly }, { default: createPlotlyComponent }] = await Promise.all([
      import("plotly.js-dist-min"),
      import("react-plotly.js/factory"),
    ]);
    return createPlotlyComponent(Plotly);
  },
  {
    ssr: false,
    loading: () => (
      <p role="status" className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        Loading chart…
      </p>
    ),
  },
);

export interface PlotlyChartProps {
  figure: ChartPayload;
  onError: (error: Error) => void;
  height?: number;
}

export function PlotlyChart({ figure, onError, height = 280 }: PlotlyChartProps) {
  const dark = useIsDarkTheme();
  return (
    <Plot
      data={figure.data}
      layout={themedLayout(figure.layout, dark)}
      config={PLOT_CONFIG}
      onError={onError}
      useResizeHandler
      style={{ width: "100%", height }}
    />
  );
}
