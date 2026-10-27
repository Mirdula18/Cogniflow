import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the product name", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "CogniFlow" })).toBeInTheDocument();
  });

  it("links to the workspace and explains the four steps", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workspace");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("shows the demo badge in mock mode", () => {
    render(<Home />);
    expect(screen.getByText("Demo scenario — scripted data")).toBeInTheDocument();
  });
});
