import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataSourceProvider } from "@/hooks/useDataSource";
import { HISTORY_STORAGE_KEY } from "@/lib/store/history";
import { replayRun } from "@/lib/store/replay";
import { useRunStore } from "@/lib/store/runStore";
import { createFixtureDataSource } from "../fixtures/dataSource";
import { buildEvents, notVerifiedInputs, retryPathInputs, type EventInput } from "../helpers/events";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { History } = await import("@/components/history/History");

function seed(id: string, inputs: EventInput[], created_at: string) {
  const first = inputs[0];
  const question = first?.type === "run_started" ? first.question : id;
  useRunStore.getState().registerRun({ id, dataset_id: "ds_fixture_tasks", question, created_at });
  buildEvents(id, inputs).forEach((e) => useRunStore.getState().appendEvent(id, e));
}

function renderHistory() {
  return render(
    <DataSourceProvider source={createFixtureDataSource()}>
      <History />
    </DataSourceProvider>,
  );
}

describe("History", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    sessionStorage.clear();
    push.mockClear();
  });

  it("shows an empty state", () => {
    renderHistory();
    expect(screen.getByText("No runs yet in this session.")).toBeInTheDocument();
  });

  it("lists runs newest first with dataset, status and duration", async () => {
    seed("r_old", retryPathInputs, "2026-10-27T09:00:00Z");
    seed("r_new", notVerifiedInputs, "2026-10-27T10:00:00Z");
    renderHistory();
    const [newest, oldest] = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    if (!newest || !oldest) throw new Error("expected two rows");
    expect(newest).toHaveTextContent("Who is over-allocated?");
    expect(newest).toHaveTextContent("Not verified — send to analyst");
    expect(oldest).toHaveTextContent("Steps shown — review before use");
    expect(oldest).toHaveTextContent(`${retryPathInputs.length - 1} s`);
    expect(await within(oldest).findByText("fixture_tasks.csv")).toBeInTheDocument();
  });

  it("replays a run in the workspace", async () => {
    seed("r_old", retryPathInputs, "2026-10-27T09:00:00Z");
    renderHistory();
    await userEvent.click(screen.getByRole("button", { name: /Replay: Which region/ }));
    expect(push).toHaveBeenCalledWith("/workspace");
    expect(useRunStore.getState().activeRunId).toBe("r_old");
    expect(useRunStore.getState().activeDatasetId).toBe("ds_fixture_tasks");
  });

  it("disables replay for a run still in progress", () => {
    useRunStore.getState().registerRun({ id: "r_live", dataset_id: "ds", question: "Live?", created_at: "2026-10-27T11:00:00Z" });
    renderHistory();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay: Live?" })).toBeDisabled();
  });

  it("clears history", async () => {
    seed("r_old", retryPathInputs, "2026-10-27T09:00:00Z");
    renderHistory();
    await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
    expect(screen.getByText("No runs yet in this session.")).toBeInTheDocument();
  });
});

describe("replayRun", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("rebuilds the view from stored events without touching the stored run", async () => {
    seed("r1", retryPathInputs, "2026-10-27T09:00:00Z");
    const stored = useRunStore.getState().runs.r1;
    const seen: string[] = [];
    await act(() =>
      replayRun("r1", async () => {
        seen.push(useRunStore.getState().views.r1?.status ?? "none");
      }),
    );
    expect(seen[0]).toBe("queued");
    expect(useRunStore.getState().views.r1?.status).toBe("succeeded");
    expect(useRunStore.getState().runs.r1).toBe(stored);
  });

  it("stops the previous replay when a new one starts", async () => {
    seed("r1", retryPathInputs, "2026-10-27T09:00:00Z");
    seed("r2", notVerifiedInputs, "2026-10-27T10:00:00Z");
    const first = replayRun("r1", (_ms, signal) => new Promise((resolve) => signal.addEventListener("abort", () => resolve())));
    await replayRun("r2", async () => {});
    await first;
    expect(useRunStore.getState().views.r1?.lastSeq).toBe(0);
    expect(useRunStore.getState().activeRunId).toBe("r2");
  });
});

describe("session persistence", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    sessionStorage.clear();
  });

  it("stores finished runs only and restores them after a reload", async () => {
    seed("r1", retryPathInputs, "2026-10-27T09:00:00Z");
    useRunStore.getState().registerRun({ id: "r_live", dataset_id: "ds", question: "q", created_at: "2026-10-27T11:00:00Z" });
    const saved = sessionStorage.getItem(HISTORY_STORAGE_KEY) ?? "{}";
    expect(Object.keys(JSON.parse(saved).state.runs)).toEqual(["r1"]);

    // Simulate a reload: memory is empty, storage still holds what was saved.
    useRunStore.setState({ runs: {}, views: {}, activeDatasetId: null });
    sessionStorage.setItem(HISTORY_STORAGE_KEY, saved);
    await useRunStore.persist.rehydrate();
    await waitFor(() => expect(useRunStore.getState().runs.r1?.status).toBe("succeeded"));
    expect(useRunStore.getState().views.r1?.report?.markdown).toBe("South fell 12.5%.");
  });
});
