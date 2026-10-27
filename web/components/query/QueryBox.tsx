"use client";

import { useId, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** UI_SPEC QueryBox states; "typing" vs "empty" is derived from `value`. */
export type QueryBoxStatus = "idle" | "submitting" | "running";

export interface QueryBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void;
  status: QueryBoxStatus;
  /** Disables input entirely, e.g. when no dataset is selected. */
  disabled?: boolean;
  disabledReason?: string;
}

const STATUS_TEXT: Record<QueryBoxStatus, string> = {
  idle: "",
  submitting: "Starting the analysis…",
  running: "Analysis in progress. You can ask another question when it finishes.",
};

export function QueryBox({ value, onChange, onSubmit, status, disabled = false, disabledReason }: QueryBoxProps) {
  const inputId = useId();
  const hintId = useId();
  const busy = status !== "idle";
  const question = value.trim();
  const canSend = !disabled && !busy && question.length > 0;
  const hint = disabled ? disabledReason : STATUS_TEXT[status];

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSend) onSubmit(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" aria-busy={busy}>
      <label htmlFor={inputId} className="text-sm font-medium">
        Ask a question about this data
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Why did delivery slip last month?"
          rows={2}
          disabled={disabled || busy}
          aria-describedby={hint ? hintId : undefined}
          className="min-h-12 resize-none"
        />
        <Button type="submit" size="lg" disabled={!canSend} aria-label={busy ? "Running" : "Ask"}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          <span>{busy ? "Running" : "Ask"}</span>
        </Button>
      </div>
      <p id={hintId} role="status" aria-live="polite" className="min-h-5 text-xs text-muted-foreground">
        {hint}
      </p>
    </form>
  );
}
