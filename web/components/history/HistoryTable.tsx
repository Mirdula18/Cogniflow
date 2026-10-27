"use client";

import { Loader2, Play } from "lucide-react";
import { VerifiedBadge } from "@/components/findings/VerifiedBadge";
import { Button } from "@/components/ui/button";
import type { Run } from "@/lib/contract";
import { isFinished, runDurationMs } from "@/lib/store/history";

export interface HistoryTableProps {
  runs: Run[];
  datasetName: (datasetId: string) => string;
  onReplay: (runId: string) => void;
}

const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "—";
  const seconds = Math.round(ms / 100) / 10;
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}

/** UI_SPEC History: question, dataset, status, duration; each row can be replayed. */
export function HistoryTable({ runs, datasetName, onReplay }: HistoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border" tabIndex={0} role="region" aria-labelledby="history-caption">
      <table className="w-full border-collapse text-sm">
        <caption id="history-caption" className="sr-only">
          Runs in this session, newest first
        </caption>
        <thead className="bg-muted text-left text-xs">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Question</th>
            <th scope="col" className="px-3 py-2 font-medium">Dataset</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Duration</th>
            <th scope="col" className="px-3 py-2 font-medium">Started</th>
            <th scope="col" className="px-3 py-2 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t align-top">
              <th scope="row" className="max-w-xs px-3 py-2 text-left font-normal">
                {run.question}
              </th>
              <td className="px-3 py-2 font-mono text-xs">{datasetName(run.dataset_id)}</td>
              <td className="px-3 py-2">
                {run.status === "queued" || run.status === "running" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    In progress
                  </span>
                ) : (
                  <VerifiedBadge status={run.status} />
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{formatDuration(runDurationMs(run))}</td>
              <td className="px-3 py-2 text-xs whitespace-nowrap">
                <time dateTime={run.created_at}>{time.format(new Date(run.created_at))}</time>
              </td>
              <td className="px-3 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReplay(run.id)}
                  disabled={!isFinished(run)}
                  aria-label={`Replay: ${run.question}`}
                >
                  <Play aria-hidden />
                  Replay
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
