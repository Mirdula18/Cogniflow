"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { QueryPanel } from "@/components/query/QueryPanel";
import { RunPanel } from "@/components/run/RunPanel";
import { DataSourceProvider } from "@/hooks/useDataSource";
import { createFixtureDataSource, FIXTURE_DATASET_ID } from "@/tests/fixtures/dataSource";

/**
 * Temporary dev-only preview of the run components on the test fixtures.
 * Remove once the workspace shell (T04) mounts QueryPanel and RunPanel.
 */
export function RunPreview() {
  const [source] = useState(() => createFixtureDataSource());

  return (
    <DataSourceProvider source={source}>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">Run preview (dev only)</h1>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <FlaskConical className="size-3.5" aria-hidden />
            Demo scenario — scripted data
          </span>
        </header>
        <p className="text-sm text-muted-foreground">
          Test fixture dataset <code className="font-mono">{FIXTURE_DATASET_ID}</code>. Not real results.
        </p>
        <QueryPanel datasetId={FIXTURE_DATASET_ID} />
        <RunPanel />
      </main>
    </DataSourceProvider>
  );
}
