"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDatasets } from "@/hooks/useDatasets";
import { replayRun } from "@/lib/store/replay";
import { useRunStore } from "@/lib/store/runStore";
import { HistoryTable } from "./HistoryTable";

/** /history: this tab's runs, newest first. Replay opens the workspace and plays the stored events again. */
export function History() {
  const router = useRouter();
  const runs = useRunStore((s) => s.runs);
  const clearRuns = useRunStore((s) => s.clearRuns);
  const { datasets } = useDatasets();
  const list = Object.values(runs).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const datasetName = (id: string) => datasets.find((d) => d.id === id)?.name ?? id;

  const replay = (runId: string) => {
    void replayRun(runId);
    router.push("/workspace");
  };

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <HistoryIcon className="size-4" aria-hidden />
          No runs yet in this session.
        </p>
        <Link href="/workspace" className={buttonVariants({ variant: "outline" })}>
          Open workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {list.length} run{list.length === 1 ? "" : "s"}. Kept in this browser tab until it is closed.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={clearRuns}>
          <Trash2 aria-hidden />
          Clear history
        </Button>
      </div>
      <HistoryTable runs={list} datasetName={datasetName} onReplay={replay} />
    </div>
  );
}
