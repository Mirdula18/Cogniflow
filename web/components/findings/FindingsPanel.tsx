import { FileText, Loader2, ShieldAlert } from "lucide-react";
import type { RunView } from "@/lib/store/runView";
import type { NumberSource } from "@/lib/findings/numbers";
import { extractNumbers, untracedNumbers } from "@/lib/findings/numbers";
import { FindingsText } from "./FindingsText";
import { VerifiedBadge } from "./VerifiedBadge";

export interface FindingsPanelProps {
  view: RunView | undefined;
  selectedKey: string | undefined;
  onSelect: (key: string, source: NumberSource) => void;
}

/** UI_SPEC FindingsPanel: empty, streaming, final; with the VerifiedBadge and analyst fallback. */
export function FindingsPanel({ view, selectedKey, onSelect }: FindingsPanelProps) {
  const running = view?.status === "queued" || view?.status === "running";
  const report = view?.report;
  const numberCount = report ? extractNumbers(report.markdown).length : 0;
  const untraced = report && view ? untracedNumbers(report.markdown, view.artifacts).length : 0;

  return (
    <section aria-labelledby="findings-heading" className="flex flex-col gap-2">
      <h3 id="findings-heading" className="text-sm font-semibold">
        Findings
      </h3>
      {view && <VerifiedBadge status={view.status} />}

      {!view && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" aria-hidden />
          The summary appears here after a run.
        </p>
      )}
      {view && !report && running && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          The summary is written when every step has finished.
        </p>
      )}

      {report && view && (
        <>
          <FindingsText markdown={report.markdown} artifacts={view.artifacts} selectedKey={selectedKey} onSelect={onSelect} />
          {numberCount > untraced && (
            <p className="text-xs text-muted-foreground">Select a number to see the step output it comes from.</p>
          )}
          {untraced > 0 && (
            <p className="text-xs text-muted-foreground">
              {untraced} number{untraced === 1 ? " is" : "s are"} not found in any step output and marked.
            </p>
          )}
          {report.citedMetrics.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Based on: <span className="font-mono">{report.citedMetrics.join(", ")}</span>
            </p>
          )}
        </>
      )}

      {(view?.status === "not_verified" || view?.status === "failed") && <AnalystFallback status={view.status} />}
    </section>
  );
}

function AnalystFallback({ status }: { status: "not_verified" | "failed" }) {
  const reason =
    status === "not_verified"
      ? "A step could not be completed after 3 attempts, so there is no checked answer."
      : "The run stopped with an error, so there is no checked answer.";
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg border border-issue/60 bg-issue-surface p-3 text-sm">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-issue" aria-hidden />
      <p>
        {reason} Send the question and the steps shown here to an analyst before using any of these numbers.
      </p>
    </div>
  );
}
