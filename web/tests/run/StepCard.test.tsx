import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CodeBlock } from "@/components/run/CodeBlock";
import { RetryBadge } from "@/components/run/RetryBadge";
import { StepCard } from "@/components/run/StepCard";
import { StepTimeline } from "@/components/run/StepTimeline";
import { deriveRunView, type StepView } from "@/lib/store/runView";
import { buildEvents, notVerifiedInputs, retryPathInputs } from "../helpers/events";

const pending: StepView = { id: "s1", goal: "Clean dates", status: "pending", attempt: 0, attempts: [], retries: [] };

describe("RetryBadge", () => {
  it("renders nothing on the first attempt", () => {
    const { container } = render(<RetryBadge attempt={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows attempt n/3 and the reason", () => {
    render(<RetryBadge attempt={2} reason="Strip currency symbol" />);
    expect(screen.getByText("Attempt 2/3")).toBeInTheDocument();
    expect(screen.getByText(/Strip currency symbol/)).toBeInTheDocument();
  });
});

describe("CodeBlock", () => {
  it("is collapsed by default and toggles with an accessible button", async () => {
    render(<CodeBlock code="df.head()" />);
    const toggle = screen.getByRole("button", { name: "Show code" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("df.head()")).not.toBeVisible();
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide code" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("df.head()")).toBeVisible();
  });

  it("opens with the keyboard", async () => {
    render(<CodeBlock code="x = 1" />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText("x = 1")).toBeVisible();
  });
});

describe("StepCard", () => {
  it.each([
    ["pending", "Pending"],
    ["running", "Running"],
    ["retrying", "Retrying"],
    ["ok", "Done"],
    ["failed", "Failed"],
  ] as const)("shows %s status as text, not colour alone", (status, label) => {
    render(<StepCard step={{ ...pending, status }} index={1} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows goal, retry badge, per-attempt code and the earlier error on the retry path", () => {
    const view = deriveRunView("r1", buildEvents("r1", retryPathInputs));
    render(<StepCard step={view.steps[0]!} index={1} />);
    expect(screen.getByRole("heading", { name: "Step 1. Parse revenue text" })).toBeInTheDocument();
    expect(screen.getByText("Attempt 2/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show code (attempt 1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show code (attempt 2)" })).toBeInTheDocument();
    expect(screen.getByText("Error on attempt 1: ValueError: could not convert")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows three errors and Failed on the not_verified path", () => {
    const view = deriveRunView("r5", buildEvents("r5", notVerifiedInputs));
    render(<StepCard step={view.steps[0]!} index={1} />);
    expect(screen.getAllByText(/^Error on attempt \d/)).toHaveLength(3);
    expect(screen.getByText("Attempt 3/3")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});

describe("StepTimeline", () => {
  it("shows a hint before the plan arrives", () => {
    render(<StepTimeline steps={[]} />);
    expect(screen.getByText(/plan appears here/)).toBeInTheDocument();
  });

  it("lists steps in plan order with progress", () => {
    const view = deriveRunView("r1", buildEvents("r1", retryPathInputs));
    render(<StepTimeline steps={view.steps} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "Step 1. Parse revenue text",
      "Step 2. Compare quarters",
    ]);
    expect(screen.getByRole("heading", { name: /Steps \(2 of 2 done\)/ })).toBeInTheDocument();
  });
});
