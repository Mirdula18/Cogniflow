/**
 * The small Markdown subset used by report summaries: headings, "-" / "*" bullet
 * lists, paragraphs and **bold**. Anything else renders as plain text, so no HTML
 * from a report ever reaches the DOM.
 */
export type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

export interface InlineSegment {
  text: string;
  bold: boolean;
}

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of markdown.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (!line) {
      flush();
    } else if (heading?.[1] !== undefined) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
    } else if (bullet?.[1] !== undefined) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "list") last.items.push(bullet[1]);
      else blocks.push({ kind: "list", items: [bullet[1]] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function splitBold(text: string): InlineSegment[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}
