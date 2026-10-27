import { describe, expect, it } from "vitest";
import { COLORWAY, themedLayout } from "@/components/canvas/plotTheme";
import { figureToTable } from "@/lib/findings/figureTable";

describe("themedLayout", () => {
  it("keeps scenario layout but forces theme colours and a transparent surface", () => {
    const layout = themedLayout({ bargap: 0.5, xaxis: { title: { text: "Region" }, gridcolor: "#000" }, paper_bgcolor: "#fff" }, true);
    expect(layout.bargap).toBe(0.5);
    expect(layout.paper_bgcolor).toBe("rgba(0,0,0,0)");
    expect(layout.colorway).toEqual([...COLORWAY.dark]);
    expect(layout.xaxis).toMatchObject({ title: { text: "Region" }, gridcolor: "rgba(255,255,255,0.1)" });
  });

  it("drops the in-plot title because the card caption shows it", () => {
    expect(themedLayout({ title: { text: "Revenue" } }, false).title).toBeUndefined();
  });
});

describe("figureToTable", () => {
  it("merges x/y traces into one row per category", () => {
    const table = figureToTable({
      data: [
        { type: "bar", name: "Q1", x: ["North", "South"], y: [10, 20] },
        { type: "bar", name: "Q2", x: ["South", "East"], y: [15, 5] },
      ],
      layout: { xaxis: { title: { text: "Region" } } },
    });
    expect(table).toEqual({
      columns: ["Region", "Q1", "Q2"],
      rows: [
        ["North", 10, null],
        ["South", 20, 15],
        ["East", null, 5],
      ],
    });
  });

  it("names unnamed traces and defaults the category column", () => {
    expect(figureToTable({ data: [{ x: [1], y: [2] }] })?.columns).toEqual(["Category", "Series 1"]);
  });

  it("returns undefined for traces without x/y arrays", () => {
    expect(figureToTable({ data: [{ type: "pie", values: [1, 2], labels: ["a", "b"] }] })).toBeUndefined();
    expect(figureToTable({ data: [] })).toBeUndefined();
  });
});
