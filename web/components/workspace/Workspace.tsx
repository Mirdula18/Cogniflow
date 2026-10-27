"use client";

import { DataPanel } from "@/components/dataset/DataPanel";
import { QueryPanel } from "@/components/query/QueryPanel";
import { RunPanel } from "@/components/run/RunPanel";
import { useRunStore } from "@/lib/store/runStore";
import { WorkspaceLayout } from "./WorkspaceLayout";

/** The main screen: data on the left, question and live steps in the middle, results on the right. */
export function Workspace() {
  const datasetId = useRunStore((s) => s.activeDatasetId);

  return (
    <WorkspaceLayout
      data={<DataPanel />}
      run={
        <>
          <QueryPanel datasetId={datasetId} />
          <RunPanel />
        </>
      }
      results={<p className="text-sm text-muted-foreground">Charts, tables and the findings summary appear here.</p>}
    />
  );
}
