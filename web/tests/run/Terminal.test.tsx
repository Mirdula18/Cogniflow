import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTerminalLine } from "@/components/run/terminalFormat";
import type { TerminalLine } from "@/lib/store/runView";

// xterm needs a real canvas; record what the component writes instead.
const xterm = vi.hoisted(() => ({ writes: [] as string[], resets: 0, disposed: 0 }));

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    textarea = document.createElement("textarea");
    loadAddon() {}
    open(host: HTMLElement) {
      host.appendChild(this.textarea);
    }
    write(data: string) {
      xterm.writes.push(data);
    }
    reset() {
      xterm.resets += 1;
    }
    dispose() {
      xterm.disposed += 1;
    }
  },
}));
vi.mock("@xterm/addon-fit", () => ({ FitAddon: class { fit() {} } }));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

const { Terminal } = await import("@/components/run/Terminal");

const out = (seq: number, text: string): TerminalLine => ({ seq, stepId: "s1", kind: "stdout", text });
const err = (seq: number, text: string): TerminalLine => ({ seq, stepId: "s1", kind: "error", text });

describe("formatTerminalLine", () => {
  it("ends lines with CRLF and converts inner newlines", () => {
    expect(formatTerminalLine(out(1, "team\nA    3"))).toBe("team\r\nA    3\r\n");
  });

  it("does not double CRs from Windows line endings", () => {
    expect(formatTerminalLine(out(1, "a\r\nb"))).toBe("a\r\nb\r\n");
  });

  it("colours error lines red and resets after", () => {
    expect(formatTerminalLine(err(1, "Error ValueError: bad"))).toBe("\x1b[31mError ValueError: bad\x1b[0m\r\n");
  });
});

describe("Terminal", () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    xterm.writes = [];
    xterm.resets = 0;
    xterm.disposed = 0;
  });

  it("writes existing lines once xterm loads, then only appends new ones", async () => {
    const first = [out(1, "Parsed 1200 values")];
    const { rerender } = render(<Terminal lines={first} />);
    await waitFor(() => expect(xterm.writes).toEqual(["Parsed 1200 values\r\n"]));

    rerender(<Terminal lines={[...first, err(2, "Error KeyError: x")]} />);
    expect(xterm.writes).toEqual(["Parsed 1200 values\r\n", "\x1b[31mError KeyError: x\x1b[0m\r\n"]);
    expect(xterm.resets).toBe(0);
  });

  it("keeps xterm's hidden input out of the tab order", async () => {
    render(<Terminal lines={[]} />);
    const textarea = await waitFor(() => {
      const el = screen.getByTestId("xterm-host").querySelector("textarea");
      if (!el) throw new Error("xterm not mounted yet");
      return el;
    });
    expect(textarea).toHaveAttribute("tabindex", "-1");
  });

  it("resets when the lines are replaced by a new run", async () => {
    const { rerender } = render(<Terminal lines={[out(1, "old run")]} />);
    await waitFor(() => expect(xterm.writes).toHaveLength(1));
    rerender(<Terminal lines={[out(1, "new run")]} />);
    expect(xterm.resets).toBe(1);
    expect(xterm.writes.at(-1)).toBe("new run\r\n");
  });

  it("mirrors output in an accessible log, with errors keeping their Error prefix", () => {
    render(<Terminal lines={[out(1, "ok"), err(2, "Error ValueError: bad")]} />);
    const log = screen.getByRole("log", { name: "Run output" });
    expect(log).toHaveTextContent("ok");
    expect(log).toHaveTextContent("Error ValueError: bad");
  });

  it("shows a hint when empty and disposes xterm on unmount", async () => {
    const { unmount } = render(<Terminal lines={[]} />);
    expect(screen.getByText(/streams here/)).toBeInTheDocument();
    await waitFor(() => expect(xterm.writes).toEqual([]));
    await new Promise((r) => setTimeout(r, 0));
    unmount();
    expect(xterm.disposed).toBe(1);
  });
});
