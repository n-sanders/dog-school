import { z } from "zod";
import type { Lesson } from "../content/schema";

export const STORAGE_KEY = "dogschool.progress.v1";
const DAY = 24 * 60 * 60 * 1000;
/** Days until a breed is due again, indexed by Leitner box (1-5). */
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 14] as const;
export const MAX_BOX = 5;

const LessonRecordSchema = z.object({
  attempts: z.number().int().min(0),
  bestScore: z.number().min(0).max(1).nullable(),
  lastAttemptAt: z.string().nullable(),
  completed: z
    .object({
      at: z.string(),
      method: z.enum(["quiz", "manual"]),
    })
    .nullable(),
});

const BreedStatSchema = z.object({
  seen: z.number().int().min(0),
  correct: z.number().int().min(0),
  box: z.number().int().min(1).max(MAX_BOX),
  due: z.string(),
  lastSeenAt: z.string(),
});

export const ProgressSchema = z.object({
  version: z.literal(1),
  lessons: z.record(z.string(), LessonRecordSchema),
  breeds: z.record(z.string(), BreedStatSchema),
});

export type LessonRecord = z.infer<typeof LessonRecordSchema>;
export type BreedStat = z.infer<typeof BreedStatSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type LessonStatus = "locked" | "available" | "completed";

export const emptyProgress = (): Progress => ({ version: 1, lessons: {}, breeds: {} });

const emptyLessonRecord = (): LessonRecord => ({
  attempts: 0,
  bestScore: null,
  lastAttemptAt: null,
  completed: null,
});

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

export function lessonStatus(progress: Progress, lesson: Lesson): LessonStatus {
  if (progress.lessons[lesson.id]?.completed) return "completed";
  const unlocked = lesson.prerequisites.every((p) => progress.lessons[p]?.completed);
  return unlocked ? "available" : "locked";
}

export function isCompleted(progress: Progress, lessonId: string): boolean {
  return !!progress.lessons[lessonId]?.completed;
}

export function accuracy(progress: Progress, slug: string): number | undefined {
  const s = progress.breeds[slug];
  return s && s.seen ? s.correct / s.seen : undefined;
}

export function dueBreeds(progress: Progress, now: Date = new Date()): string[] {
  return Object.entries(progress.breeds)
    .filter(([, s]) => new Date(s.due).getTime() <= now.getTime())
    .sort(([, a], [, b]) => a.box - b.box || a.due.localeCompare(b.due))
    .map(([slug]) => slug);
}

export function nextDue(progress: Progress): Date | undefined {
  const times = Object.values(progress.breeds).map((s) => new Date(s.due).getTime());
  return times.length ? new Date(Math.min(...times)) : undefined;
}

export function parseProgress(json: string): Progress {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const result = ProgressSchema.safeParse(data);
  if (!result.success) {
    throw new Error("That file is not a DogSchool progress backup.");
  }
  return result.data;
}

/**
 * Local-only progress store. Every change produces a new immutable snapshot and is
 * written straight to storage, so it works with React's useSyncExternalStore.
 */
export class ProgressStore {
  private state: Progress;
  private listeners = new Set<() => void>();
  /** Set when saved data existed but could not be read. */
  loadError: string | null = null;

  constructor(
    private storage: KeyValueStorage,
    private now: () => Date = () => new Date(),
  ) {
    this.state = this.load();
  }

  private load(): Progress {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    try {
      return parseProgress(raw);
    } catch {
      this.loadError =
        "Saved progress could not be read and has been set aside. You can import a backup or mark lessons completed by hand.";
      this.storage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, raw);
      return emptyProgress();
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;

  private commit(next: Progress) {
    this.state = next;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or disabled (private browsing); progress stays in memory.
    }
    this.listeners.forEach((l) => l());
  }

  private updateLesson(id: string, fn: (r: LessonRecord) => LessonRecord) {
    const current = this.state.lessons[id] ?? emptyLessonRecord();
    this.commit({ ...this.state, lessons: { ...this.state.lessons, [id]: fn(current) } });
  }

  /** Records a finished lesson quiz. Passing completes the lesson; failing never un-completes it. */
  recordQuiz(lessonId: string, score: number, passMark: number) {
    const at = this.now().toISOString();
    this.updateLesson(lessonId, (r) => ({
      attempts: r.attempts + 1,
      bestScore: Math.max(r.bestScore ?? 0, score),
      lastAttemptAt: at,
      completed: r.completed ?? (score >= passMark ? { at, method: "quiz" } : null),
    }));
  }

  /** Lets the learner mark a lesson done (or not done) by hand, e.g. after losing progress. */
  setManualCompletion(lessonId: string, completed: boolean) {
    const at = this.now().toISOString();
    this.updateLesson(lessonId, (r) => ({
      ...r,
      completed: completed ? (r.completed ?? { at, method: "manual" }) : null,
    }));
  }

  /** Records one answer about a breed and moves it between Leitner boxes. */
  recordAnswer(slug: string, correct: boolean) {
    const now = this.now();
    const prev = this.state.breeds[slug];
    const box = correct ? Math.min(MAX_BOX, (prev?.box ?? 1) + 1) : 1;
    const stat: BreedStat = {
      seen: (prev?.seen ?? 0) + 1,
      correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
      box,
      due: new Date(now.getTime() + BOX_INTERVAL_DAYS[box] * DAY).toISOString(),
      lastSeenAt: now.toISOString(),
    };
    this.commit({ ...this.state, breeds: { ...this.state.breeds, [slug]: stat } });
  }

  exportJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  importJson(json: string) {
    this.commit(parseProgress(json));
    this.loadError = null;
  }

  reset() {
    this.loadError = null;
    this.commit(emptyProgress());
  }
}

function browserStorage(): KeyValueStorage {
  try {
    const probe = "__dogschool_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

let browserStore: ProgressStore | undefined;
export function getProgressStore(): ProgressStore {
  browserStore ??= new ProgressStore(browserStorage());
  return browserStore;
}
