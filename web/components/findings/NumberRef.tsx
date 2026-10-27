import { AlertTriangle } from "lucide-react";
import type { NumberSource } from "@/lib/findings/numbers";
import { cn } from "@/lib/utils";

export interface NumberRefProps {
  text: string;
  source: NumberSource | undefined;
  selected: boolean;
  onSelect: () => void;
}

/**
 * A number in the summary. Traced numbers are buttons that highlight their source;
 * untraced ones are flagged in text, never silently shown as fact.
 */
export function NumberRef({ text, source, selected, onSelect }: NumberRefProps) {
  if (!source) {
    return (
      <span className="inline-flex items-baseline gap-0.5 rounded-sm bg-issue-surface px-0.5">
        <AlertTriangle className="size-3 self-center text-issue" aria-hidden />
        {text}
        <span className="sr-only"> (not found in any step output)</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${text}, show source`}
      title="Show where this number comes from"
      className={cn(
        "rounded-sm px-0.5 font-medium underline decoration-dotted underline-offset-4 outline-none hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "bg-primary/15 decoration-solid",
      )}
    >
      {text}
    </button>
  );
}
