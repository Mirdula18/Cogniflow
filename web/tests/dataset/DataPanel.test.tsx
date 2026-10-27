import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DataPanel } from "@/components/dataset/DataPanel";
import { DataSourceProvider } from "@/hooks/useDataSource";
import { useRunStore } from "@/lib/store/runStore";
import { createFixtureDataSource, FIXTURE_DATASET_ID } from "../fixtures/dataSource";

function renderPanel() {
  return render(
    <DataSourceProvider source={createFixtureDataSource({ sleep: async () => {} })}>
      <DataPanel />
    </DataSourceProvider>,
  );
}

const fileInput = () => screen.getByLabelText(/Upload a file/) as HTMLInputElement;

describe("DataPanel", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("lists datasets from the data source and starts with none selected", async () => {
    renderPanel();
    const select = screen.getByRole("combobox", { name: "Dataset" });
    await waitFor(() => expect(select).toBeEnabled());
    expect(within(select).getByRole("option", { name: /fixture_tasks\.csv \(40 rows × 5 cols, demo\)/ })).toBeInTheDocument();
    expect(select).toHaveValue("");
    expect(screen.getByText("Pick or upload a dataset to see its profile.")).toBeInTheDocument();
  });

  it("selects a dataset and shows its profile with issues as labelled chips", async () => {
    renderPanel();
    const select = screen.getByRole("combobox", { name: "Dataset" });
    await waitFor(() => expect(select).toBeEnabled());
    await userEvent.selectOptions(select, FIXTURE_DATASET_ID);

    expect(useRunStore.getState().activeDatasetId).toBe(FIXTURE_DATASET_ID);
    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Rows").nextSibling).toHaveTextContent("40");
    expect(screen.getByText("Duplicate rows").nextSibling).toHaveTextContent("2");
    const dueIssues = screen.getByRole("list", { name: "Issues in due" });
    expect(within(dueIssues).getByText("Mixed date formats")).toBeInTheDocument();
    expect(within(dueIssues).getByText("Issue:")).toHaveClass("sr-only");
    expect(screen.getByText("4 column issues to clean.")).toBeInTheDocument();
  });

  it("shows sample rows with blanks spelled out", async () => {
    useRunStore.getState().setActiveDataset(FIXTURE_DATASET_ID);
    renderPanel();
    await userEvent.click(await screen.findByText("Sample rows (3)"));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("(blank)")).toBeInTheDocument();
  });

  it("maps an upload to the closest demo dataset and says it was not analysed", async () => {
    renderPanel();
    await userEvent.upload(fileInput(), new File(["a,b"], "my_tasks.csv", { type: "text/csv" }));
    expect(await screen.findByText(/Demo mode: my_tasks\.csv was not analysed/)).toBeInTheDocument();
    expect(useRunStore.getState().activeDatasetId).toBe(FIXTURE_DATASET_ID);
    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("rejects unsupported file types before uploading", async () => {
    renderPanel();
    await userEvent.upload(fileInput(), new File(["x"], "notes.txt", { type: "text/plain" }), { applyAccept: false });
    expect(await screen.findByText("Error: Only .csv and .xlsx files are supported.")).toBeInTheDocument();
    expect(useRunStore.getState().activeDatasetId).toBeNull();
  });

  it("rejects files over 20 MB", async () => {
    renderPanel();
    const big = new File(["x"], "big.csv", { type: "text/csv" });
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    await userEvent.upload(fileInput(), big);
    expect(await screen.findByText("Error: Files must be 20 MB or smaller.")).toBeInTheDocument();
  });
});
