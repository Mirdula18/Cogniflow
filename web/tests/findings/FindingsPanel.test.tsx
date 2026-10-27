import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRunStore } from "@/lib/store/runStore";
import { buildEvents, notVerifiedInputs, retryPathInputs, type EventInput } from "../helpers/events";

vi.mock("@/components/canvas/PlotlyChart", () => ({ PlotlyChart: () => <div data-testid="plot" /> }));

const { ResultsPanel } = await import("@/components/canvas/ResultsPanel");

function load(runId: string, inputs: EventInput[]) {
  const store = useRunStore.getState();
  store.registerRun({ id: runId, dataset_id: "ds", question: "q", created_at: "2026-10-27T10:00:00Z" });
  store.setActiveRun(runId);
  act(() => buildEvents(runId, inputs).forEach((e) => useRunStore.getState().appendEvent(runId, e)));
}

const tableRun: EventInput[] = [
  { type: "run_started", question: "Cost overrun per project?" },
  { type: "plan", steps: [{ id: "s1", goal: "Compute overrun" }] },
  { type: "artifact", step_id: "s1", kind: "table", title: "Overrun by project", payload: { columns: ["project", "overrun_pct"], rows: [["Apollo", 8.4], ["Hermes", 21.75]] } },
  { type: "report", markdown: "## Overrun\n- **Hermes** is over by 21.75%\n- Apollo is over by 8.4%\n\nTotal budget was 999.", cited_metrics: ["overrun_pct"] },
  { type: "run_finished", status: "succeeded" },
];

describe("FindingsPanel", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("shows the empty state before any run", () => {
    render(<ResultsPanel />);
    expect(screen.getByText("The summary appears here after a run.")).toBeInTheDocument();
  });

  it("says the summary is pending while the run streams", () => {
    load("r_stream", retryPathInputs.slice(0, 4));
    render(<ResultsPanel />);
    expect(screen.getByText("The summary is written when every step has finished.")).toBeInTheDocument();
  });

  it("shows the review badge and links a number to its metric", async () => {
    load("r_ok", retryPathInputs);
    render(<ResultsPanel />);
    expect(screen.getByText("Steps shown — review before use")).toBeInTheDocument();
    expect(screen.getByText(/Based on:/)).toHaveTextContent("fall_pct");

    const number = screen.getByRole("button", { name: "12.5, show source" });
    await userEvent.click(number);
    const metric = screen.getByRole("figure", { name: "Largest fall" });
    expect(number).toHaveAttribute("aria-pressed", "true");
    expect(metric).toHaveAttribute("data-highlighted", "true");
    expect(within(metric).getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Source: Largest fall.")).toBeInTheDocument();

    await userEvent.click(number);
    expect(number).toHaveAttribute("aria-pressed", "false");
    expect(metric).not.toHaveAttribute("data-highlighted");
  });

  it("highlights the exact table cell, renders markdown, and flags untraced numbers", async () => {
    load("r_table", tableRun);
    render(<ResultsPanel />);
    expect(screen.getByRole("heading", { name: "Overrun" })).toBeInTheDocument();
    expect(screen.getByText("Hermes", { selector: "strong" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "21.75, show source" }));
    const cell = screen.getByRole("cell", { name: /21\.75/ });
    expect(cell).toHaveAttribute("data-highlighted", "true");
    expect(cell).toHaveTextContent("(source of selected number)");
    expect(screen.getByText("Source: Overrun by project, row 2, column 2.")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /999/ })).not.toBeInTheDocument();
    expect(screen.getByText("(not found in any step output)")).toBeInTheDocument();
    expect(screen.getByText(/1 number is not found in any step output/)).toBeInTheDocument();
  });

  it("shows Not verified and the analyst fallback after 3 failed attempts", () => {
    load("r_nv", [...notVerifiedInputs.slice(0, -1), { type: "report", markdown: "I could not verify this.", cited_metrics: [] }, ...notVerifiedInputs.slice(-1)]);
    render(<ResultsPanel />);
    expect(screen.queryByText(/Select a number/)).not.toBeInTheDocument();
    expect(screen.getByText("Not verified — send to analyst")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/could not be completed after 3 attempts.*Send the question/);
  });
});
