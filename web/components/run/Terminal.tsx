"use client";

import { useEffect, useRef } from "react";
import type { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import type { TerminalLine } from "@/lib/store/runView";
import { formatTerminalLine } from "./terminalFormat";

export interface TerminalProps {
  lines: TerminalLine[];
  /** Pixel height of the terminal viewport (UI_SPEC: 200px). */
  height?: number;
}

/**
 * Live run output in xterm. xterm is loaded on the client only. A visually hidden
 * text log mirrors the output for screen readers, since the xterm canvas is not readable.
 */
export function Terminal({ lines, height = 200 }: TerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const writtenRef = useRef<TerminalLine[]>([]);
  const linesRef = useRef(lines);
  linesRef.current = lines;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void (async () => {
      const [{ Terminal: XTermCtor }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !hostRef.current) return;
      const mono = getComputedStyle(document.body).getPropertyValue("--font-jetbrains-mono").trim();
      const term = new XTermCtor({
        convertEol: false,
        disableStdin: true,
        cursorBlink: false,
        fontSize: 12,
        fontFamily: mono ? `${mono}, monospace` : "monospace",
        theme: { background: "#020617", foreground: "#e2e8f0" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      // Output only: keep xterm's hidden input out of the tab order (the host is aria-hidden; the log below is read instead).
      term.textarea?.setAttribute("tabindex", "-1");
      fit.fit();
      const observer = new ResizeObserver(() => fit.fit());
      observer.observe(hostRef.current);
      termRef.current = term;
      writtenRef.current = [];
      sync(term);
      cleanup = () => {
        observer.disconnect();
        term.dispose();
        termRef.current = null;
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (termRef.current) sync(termRef.current);
  }, [lines]);

  /** Appends new lines; clears and rewrites when the line list is replaced (e.g. a new run). */
  function sync(term: XTerm) {
    const current = linesRef.current;
    const written = writtenRef.current;
    const isAppend = written.length <= current.length && written.every((l, i) => current[i] === l);
    if (!isAppend) term.reset();
    const start = isAppend ? written.length : 0;
    for (const line of current.slice(start)) term.write(formatTerminalLine(line));
    writtenRef.current = current;
  }

  return (
    <section aria-labelledby="terminal-heading" className="flex flex-col gap-1">
      <h2 id="terminal-heading" className="text-sm font-semibold">
        Output
      </h2>
      <div
        ref={hostRef}
        aria-hidden
        style={{ height }}
        className="overflow-hidden rounded-lg border bg-slate-950 p-2"
        data-testid="xterm-host"
      />
      <ol role="log" aria-live="polite" aria-label="Run output" className="sr-only">
        {lines.map((line) => (
          <li key={line.seq}>{line.text}</li>
        ))}
      </ol>
      {lines.length === 0 && <p className="text-xs text-muted-foreground">Output from each step streams here.</p>}
    </section>
  );
}
