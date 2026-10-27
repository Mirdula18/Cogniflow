import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryBox, type QueryBoxProps } from "@/components/query/QueryBox";

function Harness(props: Partial<QueryBoxProps> & { initial?: string }) {
  const [value, setValue] = useState(props.initial ?? "");
  return <QueryBox value={value} onChange={setValue} onSubmit={vi.fn()} status="idle" {...props} />;
}

describe("QueryBox", () => {
  it("has a labelled input", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Ask a question about this data")).toBeInTheDocument();
  });

  it("disables send while empty or whitespace", async () => {
    render(<Harness />);
    const send = screen.getByRole("button", { name: "Ask" });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox"), "   ");
    expect(send).toBeDisabled();
  });

  it("submits the trimmed question with the button", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole("textbox"), "  Which team is late?  ");
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(onSubmit).toHaveBeenCalledWith("Which team is late?");
  });

  it("submits on Enter and adds a newline on Shift+Enter", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox");
    await userEvent.type(box, "Line one{Shift>}{Enter}{/Shift}line two");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(box).toHaveValue("Line one\nline two");
    await userEvent.type(box, "{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Line one\nline two");
  });

  it.each(["submitting", "running"] as const)("locks input and announces status while %s", (status) => {
    const onSubmit = vi.fn();
    render(<Harness initial="Q?" status={status} onSubmit={onSubmit} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Running" })).toBeDisabled();
    expect(screen.getByRole("status")).not.toBeEmptyDOMElement();
  });

  it("shows why it is disabled", () => {
    render(<Harness disabled disabledReason="Pick a dataset first." />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Pick a dataset first.");
  });

  it("is keyboard reachable", async () => {
    render(<Harness initial="Q?" />);
    await userEvent.tab();
    expect(screen.getByRole("textbox")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Ask" })).toHaveFocus();
  });
});
