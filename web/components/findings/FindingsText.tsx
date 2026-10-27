import { Fragment, type ReactNode } from "react";
import type { ArtifactEvent } from "@/lib/contract";
import { parseBlocks, splitBold } from "@/lib/findings/markdown";
import { extractNumbers, findSource, type NumberSource } from "@/lib/findings/numbers";
import { NumberRef } from "./NumberRef";

export interface FindingsTextProps {
  markdown: string;
  artifacts: readonly ArtifactEvent[];
  /** Key of the selected number, `${block}.${segment}.${index}`. */
  selectedKey: string | undefined;
  onSelect: (key: string, source: NumberSource) => void;
}

/** The report summary with every number linked to (or flagged against) the run's artifacts. */
export function FindingsText({ markdown, artifacts, selectedKey, onSelect }: FindingsTextProps) {
  const inline = (text: string, keyPrefix: string): ReactNode =>
    splitBold(text).map((seg, s) => {
      const parts: ReactNode[] = [];
      let cursor = 0;
      for (const token of extractNumbers(seg.text)) {
        const key = `${keyPrefix}.${s}.${token.index}`;
        const source = findSource(token, artifacts);
        parts.push(seg.text.slice(cursor, token.index));
        parts.push(
          <NumberRef
            key={key}
            text={token.text}
            source={source}
            selected={selectedKey === key}
            onSelect={() => source && onSelect(key, source)}
          />,
        );
        cursor = token.index + token.text.length;
      }
      parts.push(seg.text.slice(cursor));
      const content = parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
      return seg.bold ? <strong key={s}>{content}</strong> : <Fragment key={s}>{content}</Fragment>;
    });

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {parseBlocks(markdown).map((block, b) => {
        if (block.kind === "heading") {
          return (
            <h4 key={b} className="font-semibold">
              {inline(block.text, `${b}`)}
            </h4>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={b} className="list-disc pl-5">
              {block.items.map((item, i) => (
                <li key={i}>{inline(item, `${b}-${i}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={b}>{inline(block.text, `${b}`)}</p>;
      })}
    </div>
  );
}
