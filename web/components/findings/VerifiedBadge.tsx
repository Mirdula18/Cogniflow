import { AlertOctagon, Eye, ShieldAlert, type LucideIcon } from "lucide-react";
import type { RunStatus } from "@/lib/contract";
import { cn } from "@/lib/utils";

type FinalStatus = Extract<RunStatus, "succeeded" | "not_verified" | "failed">;

const BADGE: Record<FinalStatus, { label: string; Icon: LucideIcon; className: string }> = {
  succeeded: { label: "Steps shown — review before use", Icon: Eye, className: "border-primary/40 text-foreground" },
  not_verified: {
    label: "Not verified — send to analyst",
    Icon: ShieldAlert,
    className: "border-issue/60 bg-issue-surface text-foreground",
  },
  failed: { label: "Run failed — send to analyst", Icon: AlertOctagon, className: "border-destructive/50 text-destructive" },
};

const isFinal = (s: RunStatus): s is FinalStatus => s in BADGE;

/** UI_SPEC VerifiedBadge. Never claims accuracy: a finished run is still "review before use". */
export function VerifiedBadge({ status }: { status: RunStatus }) {
  if (!isFinal(status)) return null;
  const { label, Icon, className } = BADGE[status];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium", className)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
