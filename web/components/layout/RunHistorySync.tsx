"use client";

import { useEffect } from "react";
import { useRunStore } from "@/lib/store/runStore";

/** Restores this tab's run history from sessionStorage once, after the first client render. */
export function RunHistorySync() {
  useEffect(() => {
    void useRunStore.persist.rehydrate();
  }, []);
  return null;
}
