import { describe, expect, it } from "vitest";
import type { Lesson } from "../src/content/schema";
import {
  ProgressStore,
  STORAGE_KEY,
  dueBreeds,
  lessonStatus,
  memoryStorage,
  parseProgress,
} from "../src/lib/progress";

const lesson = (id: string, prerequisites: string[] = []): Lesson =>
  ({ id, prerequisites, passMark: 0.8 }) as Lesson;

const fixedClock = (iso: string) => {
  let now = new Date(iso);
  return {
    now: () => now,
    advanceDays: (d: number) => (now = new Date(now.getTime() + d * 86400000)),
  };
};

describe("lesson status", () => {
  it("unlocks a lesson only when all prerequisites are completed", () => {
    const store = new ProgressStore(memoryStorage());
    const a = lesson("a");
    const b = lesson("b", ["a"]);
    const c = lesson("c", ["a", "b"]);
    expect(lessonStatus(store.getSnapshot(), a)).toBe("available");
    expect(lessonStatus(store.getSnapshot(), b)).toBe("locked");

    store.recordQuiz("a", 1, 0.8);
    expect(lessonStatus(store.getSnapshot(), b)).toBe("available");
    expect(lessonStatus(store.getSnapshot(), c)).toBe("locked");
  });

  it("completes a lesson only when the quiz score reaches the pass mark", () => {
    const store = new ProgressStore(memoryStorage());
    store.recordQuiz("a", 0.6, 0.8);
    expect(store.getSnapshot().lessons.a.completed).toBeNull();
    store.recordQuiz("a", 0.8, 0.8);
    expect(store.getSnapshot().lessons.a).toMatchObject({ attempts: 2, bestScore: 0.8, completed: { method: "quiz" } });
  });

  it("never un-completes a lesson because of a later failed attempt", () => {
    const store = new ProgressStore(memoryStorage());
    store.recordQuiz("a", 1, 0.8);
    store.recordQuiz("a", 0.2, 0.8);
    expect(store.getSnapshot().lessons.a).toMatchObject({ bestScore: 1, completed: { method: "quiz" } });
  });
});

describe("manual completion", () => {
  it("marks a lesson completed by hand and unlocks dependents", () => {
    const store = new ProgressStore(memoryStorage());
    store.setManualCompletion("a", true);
    expect(store.getSnapshot().lessons.a.completed?.method).toBe("manual");
    expect(lessonStatus(store.getSnapshot(), lesson("b", ["a"]))).toBe("available");
  });

  it("can mark a lesson not completed again, keeping quiz history", () => {
    const store = new ProgressStore(memoryStorage());
    store.recordQuiz("a", 0.9, 0.8);
    store.setManualCompletion("a", false);
    expect(store.getSnapshot().lessons.a).toMatchObject({ completed: null, attempts: 1, bestScore: 0.9 });
  });

  it("keeps the original completion method when marking an already-completed lesson", () => {
    const store = new ProgressStore(memoryStorage());
    store.recordQuiz("a", 1, 0.8);
    store.setManualCompletion("a", true);
    expect(store.getSnapshot().lessons.a.completed?.method).toBe("quiz");
  });
});

describe("persistence", () => {
  it("saves to storage and reloads", () => {
    const storage = memoryStorage();
    new ProgressStore(storage).setManualCompletion("a", true);
    expect(new ProgressStore(storage).getSnapshot().lessons.a.completed?.method).toBe("manual");
  });

  it("sets corrupt saved data aside instead of crashing", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const store = new ProgressStore(storage);
    expect(store.loadError).toMatch(/could not be read/);
    expect(store.getSnapshot().lessons).toEqual({});
  });

  it("round-trips through export and import", () => {
    const a = new ProgressStore(memoryStorage());
    a.setManualCompletion("x", true);
    a.recordAnswer("pug", true);
    const b = new ProgressStore(memoryStorage());
    b.importJson(a.exportJson());
    expect(b.getSnapshot()).toEqual(a.getSnapshot());
  });

  it("rejects files that are not progress backups", () => {
    expect(() => parseProgress("nope")).toThrow(/not valid JSON/);
    expect(() => parseProgress('{"version":2,"lessons":{},"breeds":{}}')).toThrow(/not a DogSchool/);
  });

  it("notifies subscribers on change and resets", () => {
    const store = new ProgressStore(memoryStorage());
    let calls = 0;
    store.subscribe(() => calls++);
    store.setManualCompletion("a", true);
    store.reset();
    expect(calls).toBe(2);
    expect(store.getSnapshot().lessons).toEqual({});
  });
});

describe("Leitner review boxes", () => {
  it("moves breeds up on correct answers and back to box 1 on mistakes", () => {
    const clock = fixedClock("2026-01-01T12:00:00Z");
    const store = new ProgressStore(memoryStorage(), clock.now);
    store.recordAnswer("pug", true);
    store.recordAnswer("pug", true);
    expect(store.getSnapshot().breeds.pug).toMatchObject({ box: 3, seen: 2, correct: 2 });
    store.recordAnswer("pug", false);
    expect(store.getSnapshot().breeds.pug).toMatchObject({ box: 1, seen: 3, correct: 2 });
  });

  it("makes missed breeds due immediately and correct ones due later", () => {
    const clock = fixedClock("2026-01-01T12:00:00Z");
    const store = new ProgressStore(memoryStorage(), clock.now);
    store.recordAnswer("pug", false);
    store.recordAnswer("beagle", true);
    expect(dueBreeds(store.getSnapshot(), clock.now())).toEqual(["pug"]);
    clock.advanceDays(1);
    expect(dueBreeds(store.getSnapshot(), clock.now())).toEqual(["pug", "beagle"]);
  });

  it("caps at box 5", () => {
    const store = new ProgressStore(memoryStorage());
    for (let i = 0; i < 10; i++) store.recordAnswer("pug", true);
    expect(store.getSnapshot().breeds.pug.box).toBe(5);
  });
});
