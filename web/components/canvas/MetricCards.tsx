import type { ArtifactEventOfKind } from "./artifacts";
import { ArtifactFrame } from "./ArtifactFrame";

export interface MetricCardsProps {
  metrics: ArtifactEventOfKind<"metric">[];
  highlightedSeq?: number;
}

const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 });

/** Headline numbers from `metric` artifacts, shown exactly as the step produced them. */
export function MetricCards({ metrics, highlightedSeq }: MetricCardsProps) {
  if (metrics.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {metrics.map((m) => {
        const { value, unit, name } = m.payload;
        return (
          <ArtifactFrame key={m.seq} artifact={m} highlighted={highlightedSeq === m.seq}>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {typeof value === "number" ? formatter.format(value) : value}
              {unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
            </p>
            <p className="font-mono text-xs text-muted-foreground">{name}</p>
          </ArtifactFrame>
        );
      })}
    </div>
  );
}
