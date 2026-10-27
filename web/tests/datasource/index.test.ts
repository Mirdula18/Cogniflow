import { afterEach, describe, expect, it, vi } from "vitest";
import { createDataSource, parseDataMode } from "@/lib/datasource";

describe("parseDataMode", () => {
  it.each([
    [undefined, "mock"],
    ["", "mock"],
    ["mock", "mock"],
    ["live", "live"],
    [" LIVE ", "live"],
  ] as const)("maps %j to %s", (input, expected) => {
    expect(parseDataMode(input)).toBe(expected);
  });

  it("rejects unknown modes instead of silently falling back", () => {
    expect(() => parseDataMode("prod")).toThrow(/NEXT_PUBLIC_DATA_MODE/);
  });
});

describe("createDataSource", () => {
  it("returns the mock adapter for mock mode", () => {
    expect(createDataSource("mock").mode).toBe("mock");
  });

  it("returns the live adapter for live mode", () => {
    expect(createDataSource("live", "http://localhost:8000").mode).toBe("live");
  });
});

describe("getDataSource", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("follows NEXT_PUBLIC_DATA_MODE and returns a single shared instance", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "live");
    vi.resetModules();
    const mod = await import("@/lib/datasource");
    expect(mod.dataMode).toBe("live");
    expect(mod.isMockMode).toBe(false);
    expect(mod.getDataSource().mode).toBe("live");
    expect(mod.getDataSource()).toBe(mod.getDataSource());
  });

  it("defaults to mock when the variable is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "");
    vi.resetModules();
    const mod = await import("@/lib/datasource");
    expect(mod.isMockMode).toBe(true);
    expect(mod.getDataSource().mode).toBe("mock");
  });
});
