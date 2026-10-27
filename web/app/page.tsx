import Link from "next/link";
import { ArrowRight, Eye, ListChecks, MessageSquareText, Upload, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DemoBadge } from "@/components/layout/DemoBadge";

const STEPS: { title: string; text: string; Icon: LucideIcon }[] = [
  { title: "Upload", text: "Add a CSV or Excel export.", Icon: Upload },
  { title: "Ask", text: "Type a question in plain words.", Icon: MessageSquareText },
  { title: "Watch steps", text: "See the plan, code and output as it runs.", Icon: ListChecks },
  { title: "Verify", text: "Check every number against the step that produced it.", Icon: Eye },
];

export default function Home() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 p-8">
      <div className="flex flex-col items-start gap-4">
        <DemoBadge />
        <h1 className="text-3xl font-semibold">CogniFlow</h1>
        <p className="text-lg text-muted-foreground">
          Ask a new question about a messy Excel or CSV file and see every step of the analysis.
        </p>
        <Link href="/workspace" className={buttonVariants({ size: "lg" })}>
          Open workspace
          <ArrowRight aria-hidden />
        </Link>
      </div>
      <section aria-labelledby="how-heading" className="flex flex-col gap-3">
        <h2 id="how-heading" className="text-sm font-semibold">
          How it works
        </h2>
        <ol className="grid gap-3 sm:grid-cols-4">
          {STEPS.map(({ title, text, Icon }, i) => (
            <li key={title} className="flex flex-col gap-1 rounded-xl border bg-card p-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-primary" aria-hidden />
                {i + 1}. {title}
              </span>
              <span className="text-xs text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
