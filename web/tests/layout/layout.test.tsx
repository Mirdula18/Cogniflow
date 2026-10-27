import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DemoBadge } from "@/components/layout/DemoBadge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/components/layout/theme";
import { DataSourceProvider } from "@/hooks/useDataSource";
import type { DataMode, DataSource } from "@/lib/datasource";
import { createFixtureDataSource } from "../fixtures/dataSource";

function withMode(mode: DataMode): DataSource {
  return { ...createFixtureDataSource(), mode };
}

describe("DemoBadge", () => {
  it("labels mock mode as scripted data", () => {
    render(
      <DataSourceProvider source={withMode("mock")}>
        <DemoBadge />
      </DataSourceProvider>,
    );
    expect(screen.getByText("Demo scenario — scripted data")).toBeInTheDocument();
  });

  it("renders nothing in live mode", () => {
    render(
      <DataSourceProvider source={withMode("live")}>
        <DemoBadge />
      </DataSourceProvider>,
    );
    expect(screen.queryByText(/Demo scenario/)).not.toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("toggles the dark class and remembers the choice", async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", { name: "Dark mode" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(document.documentElement).toHaveClass("dark");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await userEvent.click(button);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("starts pressed when the page is already dark", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  });
});
