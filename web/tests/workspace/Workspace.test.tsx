import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataSourceProvider } from "@/hooks/useDataSource";
import { useRunStore } from "@/lib/store/runStore";
import { createFixtureDataSource, FIXTURE_DATASET_ID } from "../fixtures/dataSource";

// xterm needs a real canvas; the screen-reader log mirrors its output, so assert on that.
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    loadAddon() {}
    open() {}
    write() {}
    reset() {}
    dispose() {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({ FitAddon: class { fit() {} } }));

const { Workspace } = await import("@/components/workspace/Workspace");

function renderWorkspace() {
  return render(
    <DataSourceProvider source={createFixtureDataSource({ sleep: async () => {} })}>
      <Workspace />
    </DataSourceProvider>,
  );
}

describe("Workspace", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("asks for a dataset before a question can be sent", () => {
    renderWorkspace();
    expect(screen.getByRole("textbox", { name: "Ask a question about this data" })).toBeDisabled();
  });

  it("runs a suggested question and shows its steps in the Run panel", async () => {
    useRunStore.getState().setActiveDataset(FIXTURE_DATASET_ID);
    renderWorkspace();
    const run = screen.getByRole("region", { name: "Run" });
    await userEvent.click(await within(run).findByRole("button", { name: "How many tasks are late per team?" }));
    await waitFor(() => expect(within(run).getByText(/2 of 2 done/)).toBeInTheDocument());
    expect(within(run).getByRole("heading", { name: /Clean dates and remove duplicate tasks/ })).toBeInTheDocument();
    expect(within(run).getByRole("log", { name: "Run output" })).not.toBeEmptyDOMElement();
  });
});
