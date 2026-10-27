import { describe, expect, it } from "vitest";
import { extractNumbers, findSource, parseNumber, untracedNumbers } from "@/lib/findings/numbers";
import { buildEvents } from "../helpers/events";
import type { ArtifactEvent } from "@/lib/contract";

const values = (text: string) => extractNumbers(text).map((t) => t.value);

describe("extractNumbers", () => {
  it("reads plain, decimal, negative, percent and grouped numbers", () => {
    expect(values("South fell 12.5% to ₹1,20,000 from 137,500; change -3.")).toEqual([12.5, 120000, 137500, -3]);
  });

  it("ignores digits that are part of labels", () => {
    expect(values("P1 tickets in Q3 for step s2 on the 3rd day")).toEqual([]);
  });

  it("keeps decimals so precision can be compared", () => {
    expect(extractNumbers("7.50")[0]).toMatchObject({ value: 7.5, decimals: 2, text: "7.50" });
  });
});

describe("parseNumber", () => {
  it("parses numeric cells and single-number strings", () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber("₹1,20,000")).toBe(120000);
    expect(parseNumber("12.5%")).toBe(12.5);
    expect(parseNumber("North")).toBeUndefined();
    expect(parseNumber("3 of 4")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
  });
});

describe("findSource", () => {
  const artifacts = buildEvents("r1", [
    { type: "artifact", step_id: "s1", kind: "table", title: "QoQ", payload: { columns: ["region", "change"], rows: [["North", -4.2], ["South", -12.53]] } },
    { type: "artifact", step_id: "s2", kind: "metric", title: "Fall", payload: { name: "fall_pct", value: 12.5, unit: "%" } },
    { type: "artifact", step_id: "s3", kind: "chart", title: "Tickets", payload: { data: [{ x: ["A", "B"], y: [31, 44] }] } },
  ]) as ArtifactEvent[];
  const token = (text: string) => {
    const t = extractNumbers(text)[0];
    if (!t) throw new Error(`no number in ${text}`);
    return t;
  };

  it("prefers a metric over a table cell", () => {
    expect(findSource(token("12.5"), artifacts)).toEqual({ kind: "metric", seq: 2 });
  });

  it("finds table cells at the precision written, ignoring sign", () => {
    expect(findSource(token("4.2"), artifacts)).toEqual({ kind: "table", seq: 1, row: 0, col: 1 });
    expect(findSource(token("12.53"), artifacts)).toEqual({ kind: "table", seq: 1, row: 1, col: 1 });
  });

  it("falls back to chart data", () => {
    expect(findSource(token("44"), artifacts)).toEqual({ kind: "chart", seq: 3, row: 1, col: 1 });
  });

  it("reports numbers that no artifact contains", () => {
    expect(untracedNumbers("North fell 4.2% and East fell 9.9%.", artifacts).map((t) => t.text)).toEqual(["9.9"]);
  });
});
