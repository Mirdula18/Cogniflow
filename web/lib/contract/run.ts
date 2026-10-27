import { z } from "zod";
import { RunEventSchema } from "./events";

/** Mirrors `Run` and the REST request/response bodies in docs/API_CONTRACT.md. */

export const RunStatusSchema = z.enum(["queued", "running", "succeeded", "failed", "not_verified"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunSchema = z.object({
  id: z.string().min(1),
  dataset_id: z.string().min(1),
  question: z.string().min(1),
  status: RunStatusSchema,
  created_at: z.iso.datetime({ offset: true }),
  events: z.array(RunEventSchema),
});
export type Run = z.infer<typeof RunSchema>;

export const StartRunRequestSchema = z.object({
  dataset_id: z.string().min(1),
  question: z.string().trim().min(1),
});
export type StartRunRequest = z.infer<typeof StartRunRequestSchema>;

export const StartRunResponseSchema = z.object({
  run_id: z.string().min(1),
});
export type StartRunResponse = z.infer<typeof StartRunResponseSchema>;
