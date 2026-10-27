"use client";

import { FlaskConical } from "lucide-react";
import { useDataSource } from "@/hooks/useDataSource";

/** CLAUDE.md rule 5: mock output is always labelled as scripted. Renders nothing in live mode. */
export function DemoBadge() {
  const { mode } = useDataSource();
  if (mode !== "mock") return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-issue/50 bg-issue-surface px-2 py-0.5 text-xs font-medium text-foreground"
      title="Mock mode replays scripted scenarios. These are not measured results."
    >
      <FlaskConical className="size-3.5 text-issue" aria-hidden />
      Demo scenario — scripted data
    </span>
  );
}
