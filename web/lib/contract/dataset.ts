import { z } from "zod";

/** Mirrors `Dataset`, `ColumnProfile` and `DatasetProfile` in docs/API_CONTRACT.md. */

export const DatasetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rows: z.number().int().nonnegative(),
  columns: z.number().int().nonnegative(),
  source: z.enum(["upload", "demo"]),
  created_at: z.iso.datetime({ offset: true }),
});
export type Dataset = z.infer<typeof DatasetSchema>;

export const ColumnDtypeSchema = z.enum(["number", "string", "date", "bool", "mixed"]);
export type ColumnDtype = z.infer<typeof ColumnDtypeSchema>;

export const ColumnProfileSchema = z.object({
  name: z.string().min(1),
  dtype: ColumnDtypeSchema,
  nulls: z.number().int().nonnegative(),
  unique: z.number().int().nonnegative(),
  sample: z.array(z.union([z.string(), z.number(), z.null()])),
  issues: z.array(z.string()),
});
export type ColumnProfile = z.infer<typeof ColumnProfileSchema>;

export const DatasetProfileSchema = z.object({
  dataset_id: z.string().min(1),
  rows: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  columns: z.array(ColumnProfileSchema),
  head: z.array(z.record(z.string(), z.unknown())),
});
export type DatasetProfile = z.infer<typeof DatasetProfileSchema>;
