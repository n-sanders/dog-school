import { describe, expect, it } from "vitest";
import { content } from "../src/content/loader";
import type { Breed } from "../src/content/schema";
import { seededRng } from "../src/lib/random";
import { buildLessonQuiz, isCorrect, pickDistractors, pickPracticeTarget, type ImageSource } from "../src/lib/quiz";

const breed = (slug: string) => content.breeds.get(slug)!;
const all = [...content.breeds.values()];
const firstPinned: ImageSource = (b, exclude) =>
  Promise.resolve(b.images.map((i) => i.url).find((u) => !exclude.has(u)) ?? b.images[0].url);

describe("pickDistractors", () => {
  it("prefers look-alikes, then the same group", () => {
    const husky = breed("siberian-husky");
    const pool = ["siberian-husky", "alaskan-malamute", "samoyed", "great-dane", "pug", "beagle"].map(breed);
    const picks = pickDistractors(husky, pool, all, 3, [], seededRng(1)).map((b) => b.slug);
    expect(picks.slice(0, 2).sort()).toEqual(["alaskan-malamute", "samoyed"]);
    expect(picks[2]).toBe("great-dane");
  });

  it("puts explicit distractors first and never includes the answer", () => {
    const lab = breed("labrador-retriever");
    const picks = pickDistractors(lab, [lab], all, 3, ["whippet", "labrador-retriever"], seededRng(2));
    expect(picks[0].slug).toBe("whippet");
    expect(picks.map((b) => b.slug)).not.toContain("labrador-retriever");
    expect(new Set(picks.map((b) => b.slug)).size).toBe(3);
  });

  it("fills from the whole catalog when the pool is too small", () => {
    const lab = breed("labrador-retriever");
    const picks = pickDistractors(lab, [lab, breed("golden-retriever")], all, 3, [], seededRng(3));
    expect(picks).toHaveLength(3);
    expect(picks[0].slug).toBe("golden-retriever");
  });
});

describe("buildLessonQuiz", () => {
  it("builds one question per authored item, each with the answer among 4 choices", async () => {
    for (const lesson of content.lessons.values()) {
      const qs = await buildLessonQuiz(lesson, content.breeds, firstPinned, seededRng(4));
      expect(qs).toHaveLength(lesson.quiz.length);
      for (const q of qs) {
        if (q.kind === "text") {
          expect(q.choices).toContain(q.answer);
          expect(isCorrect(q, q.answer)).toBe(true);
          continue;
        }
        expect(q.choices).toHaveLength(4);
        const slugs = q.choices.map((c) => ("breed" in c ? c.breed.slug : (c as Breed).slug));
        expect(slugs).toContain(q.breed.slug);
        expect(new Set(slugs).size).toBe(4);
        expect(isCorrect(q, q.breed.slug)).toBe(true);
      }
    }
  });

  it("uses only pinned photos from the right breed in lesson quizzes", async () => {
    const lesson = content.lessons.get("companions-04-review")!;
    const qs = await buildLessonQuiz(lesson, content.breeds, firstPinned, seededRng(5));
    for (const q of qs) {
      if (q.kind === "identify") expect(q.breed.images.map((i) => i.url)).toContain(q.image);
      if (q.kind === "find") {
        for (const c of q.choices) expect(c.breed.images.map((i) => i.url)).toContain(c.image);
        expect(new Set(q.choices.map((c) => c.image)).size).toBe(4);
      }
    }
  });
});

describe("pickPracticeTarget", () => {
  it("avoids repeating the previous breed", () => {
    const pool = [breed("pug"), breed("beagle")];
    for (let i = 0; i < 20; i++) {
      expect(pickPracticeTarget(pool, () => undefined, "pug", seededRng(i)).slug).toBe("beagle");
    }
  });

  it("favors breeds with low accuracy", () => {
    const pool = [breed("pug"), breed("beagle")];
    const rng = seededRng(7);
    let pugs = 0;
    for (let i = 0; i < 1000; i++) {
      if (pickPracticeTarget(pool, (s) => (s === "pug" ? 0 : 1), undefined, rng).slug === "pug") pugs++;
    }
    expect(pugs).toBeGreaterThan(700);
  });
});
