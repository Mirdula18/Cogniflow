import type { StepView } from "@/lib/store/runView";
import { StepCard } from "./StepCard";

export interface StepTimelineProps {
  steps: StepView[];
}

/** The plan as an ordered list of StepCards, in plan order. */
export function StepTimeline({ steps }: StepTimelineProps) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">The plan appears here once the analysis starts.</p>;
  }

  const done = steps.filter((s) => s.status === "ok").length;

  return (
    <section aria-labelledby="step-timeline-heading" className="flex flex-col gap-2">
      <h2 id="step-timeline-heading" className="text-sm font-semibold">
        Steps <span className="font-normal text-muted-foreground">({done} of {steps.length} done)</span>
      </h2>
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={step.id}>
            <StepCard step={step} index={i + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}
