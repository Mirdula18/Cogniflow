import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRunStore } from "@/lib/store/runStore";
import { buildEvents, type EventInput } from "../helpers/events";

// Plotly needs a real canvas; record the props instead.
const plot = vi.hoisted(() => ({ fail: false, figures: [] as unknown[] }));
vi.mock("@/components/canvas/PlotlyChart", () => ({
  PlotlyChart: ({ figure }: { figure: unknown }) => {
    if (plot.fail) throw new Error("bad trace");
    plot.figures.push(figure);
    return <div data-testid="plot" />;
  },
}));

const { ResultsPanel } = await import("@/components/canvas/ResultsPanel");

const RUN = "r_results";
const start: EventInput[] = [
  { type: "run_started", question: "Which region fell most?" },
  { type: "plan", steps: [{ id: "s1", goal: "Compare quarters" }] },
];
const artifacts: EventInput[] = [
  { type: "artifact", step_id: "s1", kind: "chart", title: "Revenue change by region", payload: { data: [{ type: "bar", name: "Change", x: ["North", "South"], y: [-4.2, -12.5] }] } },
  { type: "artifact", step_id: "s1", kind: "metric", title: "Largest fall", payload: { name: "fall_pct", value: 12.5, unit: "%" } },
  { type: "artifact", step_id: "s1", kind: "table", title: "QoQ by region", payload: { columns: ["region", "change_pct"], rows: [["North", -4.2], ["South", -12.5], ["East", null]] } },
];

function load(inputs: EventInput[]) {
  const store = useRunStore.getState();
  store.registerRun({ id: RUN, dataset_id: "ds", question: "q", created_at: "2026-10-27T10:00:00Z" });
  store.setActiveRun(RUN);
  act(() => buildEvents(RUN, inputs).forEach((e) => useRunStore.getState().appendEvent(RUN, e)));
}

describe("ResultsPanel", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    plot.fail = false;
    plot.figures = [];
  });

  it("shows the empty hint with no run", () => {
    render(<ResultsPanel />);
    expect(screen.getByText("Charts appear here when a step produces one.")).toBeInTheDocument();
  });

  it("shows a loading state while a run is in progress", () => {
    load(start);
    render(<ResultsPanel />);
    expect(screen.getByText("Waiting for a chart from the analysis…")).toHaveAttribute("role", "status");
  });

  it("renders chart, metric and table artifacts with their titles and source step", async () => {
    load([...start, ...artifacts]);
    render(<ResultsPanel />);

    const chart = screen.getByRole("figure", { name: /Revenue change by region/ });
    expect(within(chart).getByRole("img", { name: /Revenue change by region/ })).toContainElement(screen.getByTestId("plot"));
    expect(within(chart).getByText("From step s1")).toBeInTheDocument();
    await userEvent.click(within(chart).getByText("View chart data"));
    expect(within(chart).getByRole("cell", { name: "-12.5" })).toBeInTheDocument();

    const metric = screen.getByRole("figure", { name: /Largest fall/ });
    expect(metric).toHaveTextContent("12.5%");
    expect(metric).toHaveTextContent("fall_pct");

    const table = screen.getByRole("region", { name: "QoQ by region" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("(blank)")).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "change_pct" })).toHaveClass("text-right");
  });

  it("shows a render error instead of crashing when a chart cannot be drawn", () => {
    plot.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    load([...start, artifacts[0] as EventInput]);
    render(<ResultsPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error: the chart could not be drawn (bad trace).");
  });
});
