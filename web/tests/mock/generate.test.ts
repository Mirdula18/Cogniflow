import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DemoDatasetFileSchema } from "@/lib/mock";
import { generateAll } from "@/lib/mock/generate";

const generated = generateAll();
const profile = (id: string) => DemoDatasetFileSchema.parse(JSON.parse(generated[`${id}.profile.json`] as string));
const issues = (id: string, column: string) => profile(id).columns.find((c) => c.name === column)?.issues ?? [];

describe("mock dataset generator (seed 42)", () => {
  it("is reproducible", () => {
    expect(generateAll()).toEqual(generated);
  });

  it("matches the committed files in lib/mock/datasets (run `npm run mock:generate` if this fails)", () => {
    for (const [name, content] of Object.entries(generated)) {
      const committed = readFileSync(join(process.cwd(), "lib/mock/datasets", name));
      expect(Buffer.compare(committed, Buffer.from(content)), name).toBe(0);
    }
  });

  it("writes every profile as a contract-valid DatasetProfile with the documented shape", () => {
    const shape = Object.fromEntries(["ds_delivery", "ds_sales", "ds_tickets", "ds_costs", "ds_hr"].map((id) => [id, [profile(id).rows, profile(id).columns.length]]));
    expect(shape).toEqual({ ds_delivery: [480, 9], ds_sales: [1200, 8], ds_tickets: [900, 7], ds_costs: [300, 6], ds_hr: [150, 6] });
  });

  it("injects the deliberate mess listed in docs/MOCK_SCENARIOS.md", () => {
    expect(profile("ds_delivery").duplicates).toBe(14);
    expect(profile("ds_delivery").columns.find((c) => c.name === "owner")?.nulls).toBeGreaterThan(0);
    expect(issues("ds_delivery", "planned_end")[0]).toMatch(/Mixed date formats/);
    expect(issues("ds_sales", "revenue")[0]).toMatch(/stored as text/);
    expect(issues("ds_sales", "region")[0]).toMatch(/TN, Tamil Nadu, tamilnadu/);
    expect(profile("ds_tickets").columns.find((c) => c.name === "resolution_hours")?.nulls).toBe(54);
    expect(issues("ds_costs", "actual_cost")[0]).toMatch(/^7 negative/);
    expect(issues("ds_costs", "project")[0]).toMatch(/Title row/);
    expect(issues("ds_hr", "allocation_pct")[0]).toMatch(/^6 allocations above 100%/);
    expect(issues("ds_hr", "person_id")[0]).toMatch(/^5 names/);
  });

  it("writes the sales workbook as a zip and the cost export with a title row above the header", () => {
    expect((generated["regional_sales.xlsx"] as Buffer).subarray(0, 2).toString()).toBe("PK");
    expect((generated["project_costs.csv"] as string).split("\n")[0]).toMatch(/^Project cost export/);
  });
});
