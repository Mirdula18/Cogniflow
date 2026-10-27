import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SuggestedQuestions } from "@/components/query/SuggestedQuestions";

const questions = ["How many tasks are late per team?", "What is the total budget?"];

describe("SuggestedQuestions", () => {
  it("renders nothing without questions", () => {
    const { container } = render(<SuggestedQuestions questions={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a button per question under a heading", () => {
    render(<SuggestedQuestions questions={questions} onSelect={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Suggested questions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(questions);
  });

  it("calls onSelect with the clicked question", async () => {
    const onSelect = vi.fn();
    render(<SuggestedQuestions questions={questions} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: questions[1] }));
    expect(onSelect).toHaveBeenCalledWith(questions[1]);
  });

  it("can be disabled", () => {
    render(<SuggestedQuestions questions={questions} onSelect={vi.fn()} disabled />);
    screen.getAllByRole("button").forEach((b) => expect(b).toBeDisabled());
  });
});
