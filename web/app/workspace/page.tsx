import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/Workspace";

export const metadata: Metadata = { title: "Workspace · CogniFlow" };

export default function WorkspacePage() {
  return (
    <main id="main" className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Workspace</h1>
      <Workspace />
    </main>
  );
}
