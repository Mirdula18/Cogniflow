import type { ArtifactEvent, Cell } from "@/lib/contract";
import { figureToTable } from "./figureTable";

/** A number written in a summary, e.g. "12.5", "1,20,000", "-3". */
export interface NumberToken {
  text: string;
  value: number;
  /** Digits after the decimal point, so sources are compared at the precision shown. */
  decimals: number;
  index: number;
}

/** Where a summary number came from. Tables and charts point at one cell. */
export type NumberSource =
  | { kind: "metric"; seq: number }
  | { kind: "table" | "chart"; seq: number; row: number; col: number };

// Digits not glued to letters (so "P1", "Q3", "s2", "3rd" are labels, not numbers).
// Thousands groups may be Indian (1,20,000) or Western (120,000).
const NUMBER = /(?<![\p{L}\p{N}_.,])[-−]?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?(?![\p{L}\p{N}_]|\.\d|,\d)/gu;

function toToken(text: string, index: number): NumberToken {
  const plain = text.replace(/,/g, "").replace("−", "-");
  const decimals = plain.split(".")[1]?.length ?? 0;
  return { text, value: Number(plain), decimals, index };
}

export function extractNumbers(text: string): NumberToken[] {
  return [...text.matchAll(NUMBER)].map((m) => toToken(m[0], m.index));
}

/** A cell or metric value as a number: numbers as-is, strings like "₹1,20,000" or "12.5%" parsed. */
export function parseNumber(value: Cell | undefined): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const tokens = extractNumbers(value);
  return tokens.length === 1 ? tokens[0]?.value : undefined;
}

/** True when `source`, rounded to the precision written in the summary, equals the token (sign optional). */
export function matches(token: NumberToken, source: number): boolean {
  const scale = 10 ** token.decimals;
  const rounded = Math.round(Math.abs(source) * scale) / scale;
  return rounded === Math.abs(token.value);
}

function findInCells(token: NumberToken, rows: Cell[][]): { row: number; col: number } | undefined {
  for (const [row, cells] of rows.entries()) {
    for (const [col, cell] of cells.entries()) {
      const n = parseNumber(cell);
      if (n !== undefined && matches(token, n)) return { row, col };
    }
  }
  return undefined;
}

/**
 * First artifact holding the number, preferring metrics, then tables, then chart
 * data (CLAUDE.md rule 4: every summary number must trace to a step output).
 */
export function findSource(token: NumberToken, artifacts: readonly ArtifactEvent[]): NumberSource | undefined {
  for (const a of artifacts) {
    if (a.kind !== "metric") continue;
    const n = parseNumber(a.payload.value);
    if (n !== undefined && matches(token, n)) return { kind: "metric", seq: a.seq };
  }
  for (const a of artifacts) {
    if (a.kind !== "table") continue;
    const cell = findInCells(token, a.payload.rows);
    if (cell) return { kind: "table", seq: a.seq, ...cell };
  }
  for (const a of artifacts) {
    if (a.kind !== "chart") continue;
    const table = figureToTable(a.payload);
    const cell = table && findInCells(token, table.rows);
    if (cell) return { kind: "chart", seq: a.seq, ...cell };
  }
  return undefined;
}

/** Numbers in the summary that no artifact contains. Empty means the summary is fully traceable. */
export function untracedNumbers(markdown: string, artifacts: readonly ArtifactEvent[]): NumberToken[] {
  return extractNumbers(markdown).filter((t) => !findSource(t, artifacts));
}
