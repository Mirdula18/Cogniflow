"use client";

import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ questions, onSelect, disabled = false }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <section aria-labelledby="suggested-questions-heading" className="flex flex-col gap-2">
      <h3 id="suggested-questions-heading" className="text-xs font-medium text-muted-foreground">
        Suggested questions
      </h3>
      <ul className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <li key={q}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onSelect(q)}
              className="h-auto max-w-full whitespace-normal py-1 text-left"
            >
              <MessageSquareText aria-hidden />
              {q}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
