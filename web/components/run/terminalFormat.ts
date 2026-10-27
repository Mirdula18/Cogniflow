import type { TerminalLine } from "@/lib/store/runView";

const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/** xterm needs CRLF; strips stray CRs first so Windows line endings do not double up. */
function toCrlf(text: string): string {
  return text.replace(/\r/g, "").replace(/\n/g, "\r\n");
}

/** One terminal line as xterm output: errors in red (they already carry an "Error" text prefix). */
export function formatTerminalLine(line: TerminalLine): string {
  const body = toCrlf(line.text);
  return (line.kind === "error" ? `${RED}${body}${RESET}` : body) + "\r\n";
}
