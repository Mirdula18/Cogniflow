"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDataSource, type DataSource } from "@/lib/datasource";

const DataSourceContext = createContext<DataSource | null>(null);

/** Overrides the app-wide DataSource for a subtree (tests, dev previews). */
export function DataSourceProvider({ source, children }: { source: DataSource; children: ReactNode }) {
  return <DataSourceContext.Provider value={source}>{children}</DataSourceContext.Provider>;
}

/** The DataSource from the nearest provider, or the one selected by NEXT_PUBLIC_DATA_MODE. */
export function useDataSource(): DataSource {
  return useContext(DataSourceContext) ?? getDataSource();
}
