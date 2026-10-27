// Seeded generator (seed 42) for the five synthetic demo datasets in docs/MOCK_SCENARIOS.md.
// Run: `npm run mock:generate`. Output is committed; tests/mock/generate.test.ts fails if it drifts.
// Synthetic data only: no company, client or personal data.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { costs, delivery, hr, sales, tickets } from "./gen/datasets";
import { buildProfile } from "./gen/profile";

/** File name (relative to lib/mock/datasets/) -> content, for every dataset and its profile JSON. */
export function generateAll(): Record<string, string | Buffer> {
  const out: Record<string, string | Buffer> = {};
  for (const build of [delivery, sales, tickets, costs, hr]) {
    const { file, data, spec } = build();
    out[file] = data;
    out[`${spec.id}.profile.json`] = `${JSON.stringify(buildProfile(spec), null, 2)}\n`;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = fileURLToPath(new URL("./datasets/", import.meta.url));
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(generateAll())) writeFileSync(`${dir}${name}`, content);
  console.log(`mock datasets written to ${dir}`);
}
