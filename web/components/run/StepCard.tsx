import { AlertTriangle } from "lucide-react";
import type { StepView } from "@/lib/store/runView";
import { CodeBlock } from "./CodeBlock";
import { RetryBadge } from "./RetryBadge";
import { StepStatusLabel } from "./stepStatus";

export interface StepCardProps {
  step: StepView;
  /** 1-based position in the plan. */
  index: number;
}

/** One plan step: goal, status, retry badge, code per attempt and errors from earlier attempts. */
export function StepCard({ step, index }: StepCardProps) {
  const latestRetry = step.retries.at(-1);
  const attemptsWithCode = step.attempts.filter((a) => a.code !== undefined);
  const multipleAttempts = attemptsWithCode.length > 1;

  return (
    <article
      aria-labelledby={`step-${step.id}-goal`}
      data-status={step.status}
      className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`step-${step.id}-goal`} className="text-sm font-medium">
          <span className="text-muted-foreground">Step {index}.</span> {step.goal}
        </h3>
        <StepStatusLabel status={step.status} />
      </header>

      <RetryBadge attempt={step.attempt} reason={latestRetry?.reason} />

      {step.attempts.map((a) => (
        <div key={a.attempt} className="flex flex-col gap-1">
          {a.code !== undefined && (
            <CodeBlock code={a.code} label={multipleAttempts ? `Code (attempt ${a.attempt})` : "Code"} />
          )}
          {a.error && (
            <p className="flex items-start gap-1 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Error on attempt {a.attempt}: {a.error.type}: {a.error.message}
              </span>
            </p>
          )}
        </div>
      ))}
    </article>
  );
}
