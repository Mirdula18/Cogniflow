import { AlertTriangle } from "lucide-react";

/** A data-quality issue: amber chip with icon + text, so colour is never the only signal. */
export function IssueChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-issue/50 bg-issue-surface px-1.5 py-0.5 text-xs text-foreground">
      <AlertTriangle className="size-3.5 shrink-0 text-issue" aria-hidden />
      <span className="sr-only">Issue: </span>
      {children}
    </span>
  );
}
