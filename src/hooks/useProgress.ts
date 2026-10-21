import { useSyncExternalStore } from "react";
import { getProgressStore } from "../lib/progress";

export function useProgress() {
  const store = getProgressStore();
  const progress = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { progress, store };
}
