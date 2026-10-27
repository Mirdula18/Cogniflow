import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { QueryPanel } from "@/components/query/QueryPanel";
import { DataSourceProvider } from "@/hooks/useDataSource";
import { useRunStore } from "@/lib/store/runStore";
import { createFixtureDataSource, FIXTURE_DATASET_ID } from "../fixtures/dataSource";

function renderPanel(datasetId: string | null = FIXTURE_DATASET_ID) {
  const source = createFixtureDataSource({ sleep: async () => {} });
  return render(
    <DataSourceProvider source={source}>
      <QueryPanel datasetId={datasetId} />
    </DataSourceProvider>,
  );
}

const activeView = () => {
  const s = useRunStore.getState();
  return s.activeRunId ? s.views[s.activeRunId] : undefined;
};

describe("QueryPanel", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("loads suggested questions for the dataset from the data source", async () => {
    renderPanel();
    expect(await screen.findByRole("button", { name: "What is the total budget?" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("runs a suggested question end to end through the store", async () => {
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "What is the total budget?" }));
    await waitFor(() => expect(activeView()?.status).toBe("succeeded"));
    expect(screen.getByRole("textbox")).toHaveValue("What is the total budget?");
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("shows the closest-scenario notice for a free-text question", async () => {
    renderPanel();
    await userEvent.type(screen.getByRole("textbox"), "late tasks by team{Enter}");
    expect(await screen.findByText(/Showing closest demo scenario/)).toBeInTheDocument();
    await waitFor(() => expect(activeView()?.status).toBe("succeeded"));
  });

  it("reaches not_verified for the failing scenario", async () => {
    renderPanel();
    await userEvent.click(await screen.findByRole("button", { name: "Which owner has the most tasks?" }));
    await waitFor(() => expect(activeView()?.status).toBe("not_verified"));
  });

  it("is disabled without a dataset", () => {
    renderPanel(null);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByText("Pick a dataset first.")).toBeInTheDocument();
  });
});
