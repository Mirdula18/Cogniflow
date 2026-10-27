"use client";

import { useActiveRunView } from "@/hooks/useRun";
import { StepTimeline } from "./StepTimeline";
import { Terminal } from "./Terminal";

/** Step timeline + terminal for the active run. Mounted by the workspace RUN panel. */
export function RunPanel() {
  const view = useActiveRunView();

  return (
    <div className="flex flex-col gap-4">
      {view?.question && (
        <p className="text-sm">
          <span className="text-muted-foreground">Question: </span>
          {view.question}
        </p>
      )}
      <StepTimeline steps={view?.steps ?? []} />
      <Terminal lines={view?.terminal ?? []} />
    </div>
  );
}
