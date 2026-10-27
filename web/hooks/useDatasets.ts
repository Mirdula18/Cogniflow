"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dataset, DatasetProfile } from "@/lib/contract";
import { useDataSource } from "./useDataSource";

export type LoadStatus = "loading" | "ready" | "error";

export interface UseDatasetsResult {
  datasets: Dataset[];
  status: LoadStatus;
  error: string | undefined;
  /** Uploads through the DataSource and adds the result to the list. Rejects with the adapter's error. */
  upload: (file: File) => Promise<Dataset>;
}

const message = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

/** Datasets from the DataSource (demo datasets in mock mode). */
export function useDatasets(): UseDatasetsResult {
  const source = useDataSource();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    source.listDatasets().then(
      (list) => {
        if (cancelled) return;
        setDatasets(list);
        setStatus("ready");
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(message(err, "Datasets could not be loaded"));
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source]);

  const upload = useCallback(
    async (file: File) => {
      const dataset = await source.uploadDataset(file);
      setDatasets((list) => (list.some((d) => d.id === dataset.id) ? list : [...list, dataset]));
      return dataset;
    },
    [source],
  );

  return { datasets, status, error, upload };
}

export interface UseProfileResult {
  profile: DatasetProfile | undefined;
  status: LoadStatus | "idle";
  error: string | undefined;
}

/** The profile of one dataset; "idle" when no dataset is selected. */
export function useProfile(datasetId: string | null): UseProfileResult {
  const source = useDataSource();
  const [result, setResult] = useState<{ datasetId: string; profile?: DatasetProfile; error?: string } | null>(null);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    source.getProfile(datasetId).then(
      (profile) => !cancelled && setResult({ datasetId, profile }),
      (err: unknown) => !cancelled && setResult({ datasetId, error: message(err, "The profile could not be loaded") }),
    );
    return () => {
      cancelled = true;
    };
  }, [source, datasetId]);

  if (!datasetId) return { profile: undefined, status: "idle", error: undefined };
  if (!result || result.datasetId !== datasetId) return { profile: undefined, status: "loading", error: undefined };
  return { profile: result.profile, status: result.error ? "error" : "ready", error: result.error };
}
