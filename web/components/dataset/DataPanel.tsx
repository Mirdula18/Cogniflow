"use client";

import { useDataSource } from "@/hooks/useDataSource";
import { useDatasets, useProfile } from "@/hooks/useDatasets";
import { useRunStore } from "@/lib/store/runStore";
import { DatasetPicker } from "./DatasetPicker";
import { ProfilePanel } from "./ProfilePanel";
import { UploadDropzone } from "./UploadDropzone";

/** Workspace DATA panel: pick or upload a dataset, then show its profile. */
export function DataPanel() {
  const { mode } = useDataSource();
  const activeId = useRunStore((s) => s.activeDatasetId);
  const setActive = useRunStore((s) => s.setActiveDataset);
  const { datasets, status, error, upload } = useDatasets();
  const profile = useProfile(activeId);

  const onUpload = async (file: File) => {
    const dataset = await upload(file);
    setActive(dataset.id);
    return dataset;
  };

  return (
    <>
      <DatasetPicker datasets={datasets} status={status} error={error} value={activeId} onChange={setActive} />
      <UploadDropzone onUpload={onUpload} mockMode={mode === "mock"} />
      <ProfilePanel {...profile} />
    </>
  );
}
