"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./DemoBadge";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/workspace", label: "Workspace" },
  { href: "/history", label: "History" },
] as const;

const focusRing = "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <Link href="/" className={cn("inline-flex items-center gap-2 font-semibold", focusRing)}>
          <Workflow className="size-5 text-primary" aria-hidden />
          CogniFlow
        </Link>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {NAV.map(({ href, label }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "px-2 py-1 text-sm",
                      focusRing,
                      current ? "font-medium underline underline-offset-4" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DemoBadge />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
