import { CheckCircle2, Circle, Loader2, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import type { StepStatus } from "@/lib/store/runView";

interface StatusStyle {
  label: string;
  Icon: LucideIcon;
  className: string;
  spin?: boolean;
}

/** Icon + text + colour for each StepCard state; colour is never the only signal. */
export const STEP_STATUS: Record<StepStatus, StatusStyle> = {
  pending: { label: "Pending", Icon: Circle, className: "text-muted-foreground" },
  running: { label: "Running", Icon: Loader2, className: "text-teal-700 dark:text-teal-400", spin: true },
  retrying: { label: "Retrying", Icon: RotateCcw, className: "text-amber-700 dark:text-amber-400" },
  ok: { label: "Done", Icon: CheckCircle2, className: "text-teal-700 dark:text-teal-400" },
  failed: { label: "Failed", Icon: XCircle, className: "text-destructive" },
};

export function StepStatusLabel({ status }: { status: StepStatus }) {
  const { label, Icon, className, spin } = STEP_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <Icon className={`size-4 ${spin ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
      {label}
    </span>
  );
}
