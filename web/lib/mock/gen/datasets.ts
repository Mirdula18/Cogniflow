import { createRng } from "./rng";
import { countDuplicates, type ProfileSpec } from "./profile";
import { toCsv, toXlsx, type Row } from "./files";

export interface Built {
  /** File name written next to the profile, e.g. "project_delivery.csv". */
  file: string;
  data: string | Buffer;
  spec: ProfileSpec;
}

const SEED = 42;
const DAY = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, "0");
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const dmy = (d: Date): string => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
const count = (rows: readonly Row[], col: string, pred: (v: string) => boolean): number => rows.filter((r) => pred(r[col] ?? "")).length;
const distinct = (rows: readonly Row[], col: string): number => new Set(rows.map((r) => r[col])).size;

/** ₹ with Indian digit grouping: 120000 -> "₹1,20,000". */
export const inr = (n: number): string => {
  const s = String(n);
  if (s.length <= 3) return `₹${s}`;
  return `₹${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${s.slice(-3)}`;
};

// ds_delivery: 480 rows = 466 tasks + 14 exact duplicates; mixed date formats; blank owners.
export function delivery(): Built {
  const rng = createRng(SEED);
  const columns = ["task_id", "project", "team", "owner", "priority", "planned_start", "planned_end", "actual_end", "delay_cause"];
  const bias: Record<string, number> = { Design: 0, Backend: 2, Frontend: 1, QA: 0, DevOps: 1 };
  const causes = ["Vendor delay", "Scope change", "Resource shortage", "Client approval", "Rework"];
  const weights: Record<string, number[]> = {
    Backend: [5, 1, 1, 1, 1],
    Frontend: [1, 4, 1, 3, 2],
    Design: [1, 2, 1, 4, 2],
    QA: [1, 1, 3, 1, 4],
    DevOps: [3, 1, 4, 1, 1],
  };
  const fmt = (d: Date): string => (rng.chance(0.5) ? iso(d) : dmy(d));
  const march = new Date(Date.UTC(2026, 2, 1));
  const start0 = new Date(Date.UTC(2026, 0, 1));

  const rows: Row[] = Array.from({ length: 466 }, (_, i) => {
    const team = rng.pick(Object.keys(bias));
    const start = addDays(start0, rng.int(0, 75));
    const plannedEnd = addDays(start, rng.int(3, 14));
    const delay = rng.int(-3, 3) + (bias[team] as number) + (team === "Backend" && plannedEnd >= march ? 3 : 0);
    return {
      task_id: `T-${String(i + 1).padStart(4, "0")}`,
      project: rng.pick(["Atlas", "Beacon", "Cedar", "Delta"]),
      team,
      owner: rng.chance(0.05) ? "" : `Owner ${rng.int(1, 12)}`,
      priority: rng.weighted(["Low", "Medium", "High"], [3, 5, 2]),
      planned_start: fmt(start),
      planned_end: fmt(plannedEnd),
      actual_end: fmt(addDays(plannedEnd, delay)),
      delay_cause: delay >= 2 ? rng.weighted(causes, weights[team] as number[]) : "None",
    };
  });
  const originals = rows.slice();
  for (const i of rng.sampleIndices(originals.length, 14)) rows.splice(rng.int(0, rows.length), 0, { ...(originals[i] as Row) });

  const mixed = ["Mixed date formats (DD/MM/YYYY and YYYY-MM-DD)"];
  return {
    file: "project_delivery.csv",
    data: toCsv(columns, rows),
    spec: {
      id: "ds_delivery",
      name: "project_delivery.csv",
      columns,
      rows,
      dtypes: { planned_start: "mixed", planned_end: "mixed", actual_end: "mixed" },
      issues: {
        task_id: [`${countDuplicates(columns, rows)} duplicate rows`],
        owner: [`${count(rows, "owner", (v) => v === "")} blank owners`],
        planned_start: mixed,
        planned_end: mixed,
        actual_end: mixed,
      },
    },
  };
}

// ds_sales: 1,200 rows; revenue as "₹1,20,000" text; Tamil Nadu spelt three ways. Q1 2026 dips hardest in Tamil Nadu.
export function sales(): Built {
  const rng = createRng(SEED);
  const columns = ["order_id", "order_date", "region", "product", "channel", "sales_rep", "units", "revenue"];
  const regions = ["Tamil Nadu", "Karnataka", "Kerala", "Maharashtra", "Telangana"];
  const q1Factor: Record<string, number> = { "Tamil Nadu": 0.72, Karnataka: 1.04, Kerala: 0.93, Maharashtra: 1.12, Telangana: 0.86 };
  const price: Record<string, number> = { Controller: 18000, Sensor: 4500, Gateway: 9500, Licence: 26000 };
  const start0 = new Date(Date.UTC(2025, 9, 1));

  const rows: Row[] = Array.from({ length: 1200 }, (_, i) => {
    const date = addDays(start0, rng.int(0, 181));
    const region = rng.weighted(regions, [30, 20, 12, 22, 16]);
    const product = rng.pick(Object.keys(price));
    const units = rng.int(1, 10);
    const factor = date.getUTCFullYear() === 2026 ? (q1Factor[region] as number) : 1;
    const revenue = i === 0 ? 120000 : Math.round(units * (price[product] as number) * (rng.int(85, 115) / 100) * factor);
    return {
      order_id: `ORD-${String(i + 1).padStart(5, "0")}`,
      order_date: iso(date),
      region: region === "Tamil Nadu" ? rng.pick(["TN", "Tamil Nadu", "tamilnadu"]) : region,
      product,
      channel: rng.pick(["Direct", "Partner", "Online"]),
      sales_rep: `Rep ${rng.int(1, 15)}`,
      units: String(units),
      revenue: inr(revenue),
    };
  });

  return {
    file: "regional_sales.xlsx",
    data: toXlsx(columns, rows, ["units"]),
    spec: {
      id: "ds_sales",
      name: "regional_sales.xlsx",
      columns,
      rows,
      dtypes: { order_date: "date", units: "number" },
      issues: {
        region: ["Tamil Nadu spelt 3 ways (TN, Tamil Nadu, tamilnadu)"],
        revenue: ["Numbers stored as text (₹ and commas)"],
      },
    },
  };
}

// ds_tickets: 900 rows; free-text priority; exactly 6% (54) blank resolution_hours.
export function tickets(): Built {
  const rng = createRng(SEED);
  const columns = ["ticket_id", "created_at", "category", "priority", "status", "assigned_team", "resolution_hours"];
  const spellings: Record<string, [string[], number[]]> = {
    P1: [["P1", "High", "high ", "HIGH"], [4, 3, 2, 1]],
    P2: [["P2", "Medium", "medium "], [3, 4, 2]],
    P3: [["P3", "Low", "low"], [3, 4, 2]],
  };
  const start0 = new Date(Date.UTC(2026, 0, 1));

  const rows: Row[] = Array.from({ length: 900 }, (_, i) => {
    const level = rng.weighted(["P1", "P2", "P3"], [33, 40, 27]);
    const [names, w] = spellings[level] as [string[], number[]];
    const slow = rng.chance(level === "P1" ? 0.3 : 0.5);
    const hours = rng.int(10, 150) / 10 + (slow ? rng.int(80, 400) / 10 : 0);
    const d = addDays(start0, rng.int(0, 89));
    return {
      ticket_id: `TK-${String(i + 1).padStart(4, "0")}`,
      created_at: `${iso(d)} ${pad(rng.int(0, 23))}:${pad(rng.int(0, 59))}`,
      category: rng.pick(["Billing", "Login", "Performance", "Data export", "Other"]),
      priority: rng.weighted(names, w),
      status: rng.pick(["Resolved", "Closed"]),
      assigned_team: rng.pick(["L1", "L2", "L3"]),
      resolution_hours: hours.toFixed(1),
    };
  });
  for (const i of rng.sampleIndices(rows.length, 54)) (rows[i] as Row).resolution_hours = "";

  return {
    file: "support_tickets.csv",
    data: toCsv(columns, rows),
    spec: {
      id: "ds_tickets",
      name: "support_tickets.csv",
      columns,
      rows,
      dtypes: { created_at: "date", resolution_hours: "number" },
      issues: {
        priority: [`${distinct(rows, "priority")} spellings for 3 priority levels (High, high , P1 ...)`],
        resolution_hours: [`${count(rows, "resolution_hours", (v) => v === "")} blank resolution times (6%)`],
      },
    },
  };
}

// ds_costs: 300 rows (10 projects x 6 months x 5 categories); title row above the header; 7 negative actuals.
export function costs(): Built {
  const rng = createRng(SEED);
  const columns = ["project", "month", "category", "budget", "actual_cost", "vendor"];
  const projects = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet"];
  const scale = [1.0, 1.3, 0.8, 1.6, 0.7, 1.1, 0.9, 1.4, 1.2, 0.6];
  const overrun = [-0.04, 0.03, 0.11, 0.24, 0.0, 0.08, -0.02, 0.17, 0.05, 0.29];
  const base: Record<string, number> = { Labour: 120000, Materials: 80000, Equipment: 50000, Travel: 15000, Software: 30000 };

  const rows: Row[] = [];
  for (const [p, project] of projects.entries()) {
    for (const month of ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]) {
      for (const [category, amount] of Object.entries(base)) {
        const budget = Math.round((amount * (scale[p] as number) * (rng.int(90, 110) / 100)) / 100) * 100;
        const actual = Math.round(budget * (1 + (overrun[p] as number) + rng.int(-6, 6) / 100));
        rows.push({ project, month, category, budget: String(budget), actual_cost: String(actual), vendor: `Vendor ${rng.int(1, 8)}` });
      }
    }
  }
  for (const i of rng.sampleIndices(rows.length, 7)) {
    const r = rows[i] as Row;
    r.actual_cost = `-${r.actual_cost}`;
  }

  return {
    file: "project_costs.csv",
    data: toCsv(columns, rows, ["Project cost export - FY2025-26,,,,,"]),
    spec: {
      id: "ds_costs",
      name: "project_costs.csv",
      columns,
      rows,
      dtypes: { budget: "number", actual_cost: "number" },
      issues: {
        project: ["Title row above the header (merged cells in the export)"],
        actual_cost: [`${count(rows, "actual_cost", (v) => v.startsWith("-"))} negative costs (likely sign typos)`],
      },
    },
  };
}

// ds_hr: 150 rows (75 per sprint); some allocations above 100%; 5 names under two person IDs each.
export function hr(): Built {
  const rng = createRng(SEED);
  const columns = ["person_id", "name", "team", "project", "sprint", "allocation_pct"];
  const first = ["Asha", "Bala", "Chitra", "Dev", "Esha", "Farid", "Gita", "Hari", "Indu", "Jai", "Kavya", "Lalit"];
  const last = ["Iyer", "Nair", "Rao", "Shah", "Das", "Menon", "Pillai", "Reddy", "Singh", "Verma", "Kumar", "Bose"];
  const teams = ["Platform", "Mobile", "Data", "Support"];
  const names = rng.sampleIndices(first.length * last.length, 48).map((n) => `${first[Math.floor(n / last.length)]} ${last[n % last.length]}`);
  const people = names.map((name, i) => ({ id: `E${String(i + 1).padStart(3, "0")}`, name, team: rng.pick(teams) }));
  for (const [k, i] of rng.sampleIndices(people.length, 5).entries()) {
    const src = people[i] as (typeof people)[number];
    people.push({ id: `E${String(49 + k).padStart(3, "0")}`, name: src.name, team: src.team });
  }

  const rows: Row[] = [];
  for (const sprint of ["S11", "S12"]) {
    const assigned = [...people, ...rng.sampleIndices(people.length, 22).map((i) => people[i] as (typeof people)[number])];
    const used = new Map<string, Set<string>>();
    for (const p of assigned) {
      const taken = used.get(p.id) ?? new Set<string>();
      let project = rng.pick(["Atlas", "Beacon", "Cedar", "Delta", "Echo"]);
      while (taken.has(project)) project = rng.pick(["Atlas", "Beacon", "Cedar", "Delta", "Echo"]);
      taken.add(project);
      used.set(p.id, taken);
      rows.push({ person_id: p.id, name: p.name, team: p.team, project, sprint, allocation_pct: String(rng.pick([20, 25, 30, 40, 50, 60, 70, 80, 100])) });
    }
  }
  for (const i of rng.sampleIndices(rows.length, 6)) (rows[i] as Row).allocation_pct = rng.pick(["120", "150"]);

  return {
    file: "team_allocation.csv",
    data: toCsv(columns, rows),
    spec: {
      id: "ds_hr",
      name: "team_allocation.csv",
      columns,
      rows,
      dtypes: { allocation_pct: "number" },
      issues: {
        person_id: ["5 names appear under two different person IDs"],
        allocation_pct: [`${count(rows, "allocation_pct", (v) => Number(v) > 100)} allocations above 100%`],
      },
    },
  };
}
