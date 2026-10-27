import type { ReactNode } from "react";
import { Crosshair } from "lucide-react";
import type { ArtifactEvent } from "@/lib/contract";
import { cn } from "@/lib/utils";

/** Stable DOM id for an artifact, so the findings summary can point at it. */
export const artifactDomId = (artifact: Pick<ArtifactEvent, "seq">) => `artifact-${artifact.seq}`;

export interface ArtifactFrameProps {
  artifact: ArtifactEvent;
  /** True when a number in the summary that comes from this artifact is selected. */
  highlighted?: boolean;
  children: ReactNode;
  className?: string;
}

/** Card around one artifact: title, step it came from, and a visible "source" marker when highlighted. */
export function ArtifactFrame({ artifact, highlighted = false, children, className }: ArtifactFrameProps) {
  const id = artifactDomId(artifact);
  return (
    <figure
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      data-highlighted={highlighted || undefined}
      className={cn(
        "flex scroll-mt-4 flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground outline-none",
        highlighted && "ring-3 ring-primary",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span id={`${id}-title`} className="text-sm font-medium">{artifact.title || "Untitled result"}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {highlighted && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Crosshair className="size-3.5 text-primary" aria-hidden />
              Source
            </span>
          )}
          From step {artifact.step_id}
        </span>
      </figcaption>
      {children}
    </figure>
  );
}
