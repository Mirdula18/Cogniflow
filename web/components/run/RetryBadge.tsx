import { RotateCcw } from "lucide-react";
import { MAX_ATTEMPTS } from "@/lib/store/runView";

export interface RetryBadgeProps {
  attempt: number;
  maxAttempts?: number;
  /** Why the agent is retrying, from the latest `retry` event. */
  reason?: string;
}

/** "Attempt n/3" with the retry reason. Renders nothing on the first attempt. */
export function RetryBadge({ attempt, maxAttempts = MAX_ATTEMPTS, reason }: RetryBadgeProps) {
  if (attempt <= 1) return null;
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <RotateCcw className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium">
        Attempt {attempt}/{maxAttempts}
      </span>
      {reason && <span>— {reason}</span>}
    </span>
  );
}
