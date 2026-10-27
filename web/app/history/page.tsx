import type { Metadata } from "next";
import { History } from "@/components/history/History";

export const metadata: Metadata = { title: "History · CogniFlow" };

export default function HistoryPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Run history</h1>
      <History />
    </main>
  );
}
