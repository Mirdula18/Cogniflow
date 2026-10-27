import { AlertCircle } from "lucide-react";
import type { DatasetProfile } from "@/lib/contract";
import type { UseProfileResult } from "@/hooks/useDatasets";
import { ColumnList } from "./ColumnList";
import { IssueChip } from "./IssueChip";
import { SampleRows } from "./SampleRows";

export type ProfilePanelProps = UseProfileResult;

const count = new Intl.NumberFormat("en-IN");

/** UI_SPEC ProfilePanel: loading skeleton, loaded, issues highlighted as amber chips. */
export function ProfilePanel({ profile, status, error }: ProfilePanelProps) {
  if (status === "idle") {
    return <p className="text-sm text-muted-foreground">Pick or upload a dataset to see its profile.</p>;
  }
  if (status === "loading") return <ProfileSkeleton />;
  if (status === "error" || !profile) {
    return (
      <p role="alert" className="flex items-center gap-1 text-sm text-destructive">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        Error: {error ?? "The profile could not be loaded"}
      </p>
    );
  }
  return <LoadedProfile profile={profile} />;
}

function LoadedProfile({ profile }: { profile: DatasetProfile }) {
  const issueCount = profile.columns.reduce((n, c) => n + c.issues.length, 0);
  const stats = [
    { label: "Rows", value: count.format(profile.rows) },
    { label: "Columns", value: count.format(profile.columns.length) },
    { label: "Duplicate rows", value: count.format(profile.duplicates) },
  ];

  return (
    <section aria-labelledby="profile-heading" className="flex flex-col gap-3">
      <h3 id="profile-heading" className="text-sm font-semibold">
        Profile
      </h3>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg border p-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-mono text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {profile.duplicates > 0 && <IssueChip>{`${count.format(profile.duplicates)} duplicate rows`}</IssueChip>}
      <p className="text-xs text-muted-foreground">
        {issueCount === 0 ? "No column issues found." : `${issueCount} column issue${issueCount === 1 ? "" : "s"} to clean.`}
      </p>
      <ColumnList columns={profile.columns} />
      <SampleRows profile={profile} />
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-muted" />
      ))}
    </div>
  );
}
