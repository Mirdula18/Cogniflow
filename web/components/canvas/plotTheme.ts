/**
 * Categorical colourway, fixed order, never cycled. Validated with the dataviz
 * palette checker (adjacent-pair CVD and normal-vision separation, both modes).
 * The UI teal is not used for series: it fails the chart chroma floor.
 */
export const COLORWAY = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
} as const;

interface Ink {
  text: string;
  muted: string;
  grid: string;
  hoverBg: string;
}

const INK: Record<"light" | "dark", Ink> = {
  light: { text: "#0f172a", muted: "#475569", grid: "#e2e8f0", hoverBg: "#ffffff" },
  dark: { text: "#f1f5f9", muted: "#94a3b8", grid: "rgba(255,255,255,0.1)", hoverBg: "#0f172a" },
};

type Layout = Record<string, unknown>;

function axis(base: unknown, ink: Ink): Layout {
  const own = base && typeof base === "object" ? (base as Layout) : {};
  return { automargin: true, ...own, gridcolor: ink.grid, linecolor: ink.grid, zerolinecolor: ink.grid, tickfont: { color: ink.muted } };
}

/**
 * Applies the app's chart look (transparent surface, slate ink, recessive grid,
 * thin marks) under the scenario's own layout. Scenario values win except colours
 * that would break dark mode, which are always set here.
 */
export function themedLayout(layout: Layout | undefined, dark: boolean): Layout {
  const mode = dark ? "dark" : "light";
  const ink = INK[mode];
  const own = layout ?? {};
  return {
    margin: { t: 16, r: 16, b: 48, l: 56 },
    barcornerradius: 4,
    bargap: 0.25,
    hovermode: "closest",
    legend: { orientation: "h", y: -0.2 },
    ...own,
    title: undefined,
    autosize: true,
    colorway: [...COLORWAY[mode]],
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, system-ui, sans-serif", size: 12, color: ink.text },
    hoverlabel: { bgcolor: ink.hoverBg, bordercolor: ink.grid, font: { color: ink.text } },
    xaxis: axis(own.xaxis, ink),
    yaxis: axis(own.yaxis, ink),
    template: { data: { scatter: [{ line: { width: 2 }, marker: { size: 8 } }] } },
  };
}

export const PLOT_CONFIG = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d", "toggleSpikelines"],
} as const;
