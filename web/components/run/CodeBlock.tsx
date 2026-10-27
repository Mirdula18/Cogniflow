"use client";

import { useId, useState } from "react";
import { ChevronRight, Code2 } from "lucide-react";

export interface CodeBlockProps {
  code: string;
  language?: "python";
  /** Button text, e.g. "Code (attempt 2)". */
  label?: string;
  defaultOpen?: boolean;
}

/** Collapsible, read-only view of generated code. */
export function CodeBlock({ code, language = "python", label = "Code", defaultOpen = false }: CodeBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={regionId}
        className="inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
        <Code2 className="size-3.5" aria-hidden />
        {open ? "Hide" : "Show"} {label.charAt(0).toLowerCase() + label.slice(1)}
      </button>
      <div id={regionId} hidden={!open}>
        <pre
          tabIndex={0}
          aria-label={`${label} (${language})`}
          className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
