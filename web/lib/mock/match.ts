import type { ScenarioFile } from "./scenarioFile";

const STOP_WORDS = new Set(["the", "and", "for", "are", "was", "did", "who", "what", "which", "why", "how", "this", "that", "with", "per", "last", "next"]);

export function normaliseQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywords(text: string): Set<string> {
  return new Set(
    normaliseQuestion(text)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

/** Jaccard overlap of keyword sets, 0..1. */
export function similarity(a: string, b: string): number {
  const ka = keywords(a);
  const kb = keywords(b);
  if (ka.size === 0 || kb.size === 0) return 0;
  let shared = 0;
  ka.forEach((w) => {
    if (kb.has(w)) shared += 1;
  });
  return shared / (ka.size + kb.size - shared);
}

export interface ScenarioMatch {
  scenario: ScenarioFile;
  /** False when the question is not a suggested one and the closest scenario is shown instead. */
  exact: boolean;
}

/**
 * ARCHITECTURE.md §4: exact match on a suggested question, otherwise the closest
 * scenario for that dataset. Undefined when the dataset has no scenarios.
 */
export function matchScenario(
  scenarios: readonly ScenarioFile[],
  datasetId: string,
  question: string,
): ScenarioMatch | undefined {
  const candidates = scenarios
    .filter((s) => s.dataset_id === datasetId)
    .sort((a, b) => a.scenario_id.localeCompare(b.scenario_id));
  const wanted = normaliseQuestion(question);

  const exact = candidates.find((s) => normaliseQuestion(s.question) === wanted);
  if (exact) return { scenario: exact, exact: true };

  let best: ScenarioFile | undefined;
  let bestScore = -1;
  for (const s of candidates) {
    const score = similarity(question, s.question);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best ? { scenario: best, exact: false } : undefined;
}
