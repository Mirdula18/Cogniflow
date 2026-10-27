import { describe, expect, it } from "vitest";
import { parseBlocks, splitBold } from "@/lib/findings/markdown";

describe("parseBlocks", () => {
  it("splits headings, lists and paragraphs", () => {
    expect(parseBlocks("# Title\nLine one\nline two\n\n- a\n* b\nAfter")).toEqual([
      { kind: "heading", text: "Title" },
      { kind: "paragraph", text: "Line one line two" },
      { kind: "list", items: ["a", "b"] },
      { kind: "paragraph", text: "After" },
    ]);
  });

  it("treats HTML as plain text", () => {
    expect(parseBlocks("<b>x</b>")).toEqual([{ kind: "paragraph", text: "<b>x</b>" }]);
  });
});

describe("splitBold", () => {
  it("marks **bold** segments", () => {
    expect(splitBold("South **fell 12.5%** most")).toEqual([
      { text: "South ", bold: false },
      { text: "fell 12.5%", bold: true },
      { text: " most", bold: false },
    ]);
  });
});
