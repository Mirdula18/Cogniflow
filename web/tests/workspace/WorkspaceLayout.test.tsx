import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

function renderLayout() {
  return render(<WorkspaceLayout data={<p>data content</p>} run={<p>run content</p>} results={<p>results content</p>} />);
}

const panel = (name: string) => screen.getByRole("region", { name });

describe("WorkspaceLayout", () => {
  it("renders all three labelled panels", () => {
    renderLayout();
    expect(panel("Data")).toHaveTextContent("data content");
    expect(panel("Run")).toHaveTextContent("run content");
    expect(panel("Results")).toHaveTextContent("results content");
  });

  it("shows the Run tab first and hides the other panels below lg", () => {
    renderLayout();
    expect(screen.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
    expect(panel("Run")).toHaveClass("flex");
    expect(panel("Data")).toHaveClass("hidden", "lg:flex");
  });

  it("switches panels by click", async () => {
    renderLayout();
    await userEvent.click(screen.getByRole("tab", { name: "Results" }));
    expect(screen.getByRole("tab", { name: "Results" })).toHaveAttribute("aria-selected", "true");
    expect(panel("Results")).not.toHaveClass("hidden");
    expect(panel("Run")).toHaveClass("hidden");
  });

  it("moves between tabs with arrow keys, Home and End, keeping one tab in the tab order", async () => {
    renderLayout();
    screen.getByRole("tab", { name: "Run" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Results" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Data" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Results" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Data" })).toHaveAttribute("aria-selected", "true");
    const focusable = screen.getAllByRole("tab").filter((t) => t.tabIndex === 0);
    expect(focusable).toHaveLength(1);
  });
});
