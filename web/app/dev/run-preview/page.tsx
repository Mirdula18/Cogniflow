import { notFound } from "next/navigation";
import { RunPreview } from "./RunPreview";

export const metadata = { title: "Run preview (dev) · CogniFlow" };

/** Dev-only: renders the run components against test fixtures. 404 in production builds. */
export default function RunPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <RunPreview />;
}
