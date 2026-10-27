"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Database, LineChart, ListChecks, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelId = "data" | "run" | "results";

const PANELS: { id: PanelId; label: string; Icon: LucideIcon }[] = [
  { id: "data", label: "Data", Icon: Database },
  { id: "run", label: "Run", Icon: ListChecks },
  { id: "results", label: "Results", Icon: LineChart },
];

export interface WorkspaceLayoutProps {
  data: ReactNode;
  run: ReactNode;
  results: ReactNode;
  /** Tab shown first below 1024px. */
  initialTab?: PanelId;
}

/**
 * UI_SPEC workspace: DATA (280px) · RUN (flex) · RESULTS (420px) side by side from
 * 1024px (`lg`); below that the panels become tabs. Arrow keys move between tabs.
 */
export function WorkspaceLayout({ data, run, results, initialTab = "run" }: WorkspaceLayoutProps) {
  const [active, setActive] = useState<PanelId>(initialTab);
  const tabRefs = useRef<Record<PanelId, HTMLButtonElement | null>>({ data: null, run: null, results: null });
  const content: Record<PanelId, ReactNode> = { data, run, results };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = PANELS.findIndex((p) => p.id === active);
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: PANELS.length - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = PANELS[(target + PANELS.length) % PANELS.length];
    if (!next) return;
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="Workspace panels" onKeyDown={onKeyDown} className="flex border-b px-2 lg:hidden">
        {PANELS.map(({ id, label, Icon }) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            onClick={() => setActive(id)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active === id ? "border-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)_420px] lg:divide-x">
        {PANELS.map(({ id, label }) => (
          <section
            key={id}
            id={`panel-${id}`}
            aria-labelledby={`panel-${id}-heading`}
            className={cn("min-w-0 flex-col gap-4 overflow-y-auto p-4", active === id ? "flex" : "hidden lg:flex")}
          >
            <h2 id={`panel-${id}-heading`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {label}
            </h2>
            {content[id]}
          </section>
        ))}
      </div>
    </div>
  );
}
