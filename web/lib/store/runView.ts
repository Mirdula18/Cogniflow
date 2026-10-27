import type {
  ArtifactEvent,
  DatasetProfile,
  PlanStep,
  RunEvent,
  RunEventOf,
  RunStatus,
} from "@/lib/contract";

/** Matches the StepCard states in docs/UI_SPEC.md. */
export type StepStatus = "pending" | "running" | "retrying" | "ok" | "failed";

export interface StepAttempt {
  attempt: number;
  code?: string;
  error?: { type: string; message: string };
}

export interface StepView {
  id: string;
  goal: string;
  status: StepStatus;
  /** Current attempt (0 until the step starts). */
  attempt: number;
  attempts: StepAttempt[];
  retries: { nextAttempt: number; reason: string }[];
}

export interface TerminalLine {
  seq: number;
  stepId: string;
  kind: "stdout" | "error";
  text: string;
}

export interface RunView {
  runId: string;
  status: RunStatus;
  question?: string;
  profile?: DatasetProfile;
  steps: StepView[];
  terminal: TerminalLine[];
  artifacts: ArtifactEvent[];
  report?: { markdown: string; citedMetrics: string[] };
  lastSeq: number;
}

export const MAX_ATTEMPTS = 3;

export function initialRunView(runId: string): RunView {
  return { runId, status: "queued", steps: [], terminal: [], artifacts: [], lastSeq: 0 };
}

function newStep(id: string, goal: string): StepView {
  return { id, goal, status: "pending", attempt: 0, attempts: [], retries: [] };
}

/** Immutably updates one step; events for a step missing from the plan get a placeholder step. */
function updateStep(view: RunView, stepId: string, update: (step: StepView) => StepView): RunView {
  const exists = view.steps.some((s) => s.id === stepId);
  const steps = exists ? view.steps : [...view.steps, newStep(stepId, stepId)];
  return { ...view, steps: steps.map((s) => (s.id === stepId ? update(s) : s)) };
}

function updateAttempt(step: StepView, attempt: number, patch: Partial<StepAttempt>): StepView {
  const found = step.attempts.some((a) => a.attempt === attempt);
  const attempts = found
    ? step.attempts.map((a) => (a.attempt === attempt ? { ...a, ...patch } : a))
    : [...step.attempts, { attempt, ...patch }];
  return { ...step, attempts };
}

function applyStepEvent(
  view: RunView,
  event: RunEventOf<"step_started" | "code" | "error" | "retry" | "step_finished">,
): RunView {
  switch (event.type) {
    case "step_started":
      return updateStep(view, event.step_id, (s) =>
        updateAttempt({ ...s, status: "running", attempt: event.attempt }, event.attempt, {}),
      );
    case "code":
      return updateStep(view, event.step_id, (s) => updateAttempt(s, event.attempt, { code: event.source }));
    case "error": {
      const withLine = {
        ...view,
        terminal: [
          ...view.terminal,
          { seq: event.seq, stepId: event.step_id, kind: "error" as const, text: `Error ${event.error_type}: ${event.message}` },
        ],
      };
      return updateStep(withLine, event.step_id, (s) => ({
        ...updateAttempt(s, event.attempt, { error: { type: event.error_type, message: event.message } }),
        status: event.attempt < MAX_ATTEMPTS ? "retrying" : "failed",
      }));
    }
    case "retry":
      return updateStep(view, event.step_id, (s) => ({
        ...s,
        status: "retrying",
        attempt: event.next_attempt,
        retries: [...s.retries, { nextAttempt: event.next_attempt, reason: event.reason }],
      }));
    case "step_finished":
      return updateStep(view, event.step_id, (s) => ({ ...s, status: event.status }));
  }
}

/**
 * Pure reducer: folds one contract event into the run view.
 * Events at or below `lastSeq` are ignored, so replays and SSE resumes are idempotent.
 */
export function reduceRunEvent(view: RunView, event: RunEvent): RunView {
  if (event.seq <= view.lastSeq) return view;
  const next = { ...view, lastSeq: event.seq };

  switch (event.type) {
    case "run_started":
      return { ...next, status: "running", question: event.question };
    case "profile":
      return { ...next, profile: event.profile };
    case "plan":
      return { ...next, steps: event.steps.map((s: PlanStep) => newStep(s.id, s.goal)) };
    case "stdout":
      return {
        ...next,
        terminal: [...next.terminal, { seq: event.seq, stepId: event.step_id, kind: "stdout", text: event.text }],
      };
    case "artifact":
      return { ...next, artifacts: [...next.artifacts, event] };
    case "report":
      return { ...next, report: { markdown: event.markdown, citedMetrics: event.cited_metrics } };
    case "run_finished":
      return { ...next, status: event.status };
    default:
      return applyStepEvent(next, event);
  }
}

/** Builds a run view from a full event list (e.g. replaying history). */
export function deriveRunView(runId: string, events: readonly RunEvent[]): RunView {
  return [...events].sort((a, b) => a.seq - b.seq).reduce(reduceRunEvent, initialRunView(runId));
}
