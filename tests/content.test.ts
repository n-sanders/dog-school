import { describe, expect, it } from "vitest";
import { content } from "../src/content/loader";
import { checkIntegrity, parseBreed, parseLesson } from "../src/content/parse";
import type { Breed, Lesson } from "../src/content/schema";

describe("content loader", () => {
  it("loads every curriculum lesson and breed", () => {
    expect(content.lessonOrder.length).toBe(content.lessons.size);
    expect(content.breeds.size).toBeGreaterThanOrEqual(30);
    for (const id of content.lessonOrder) expect(content.lessons.get(id)?.body.length).toBeGreaterThan(0);
  });

  it("starts with a lesson that has no prerequisites", () => {
    expect(content.lessons.get(content.lessonOrder[0])!.prerequisites).toEqual([]);
  });

  it("every breed is taught in at least one lesson", () => {
    const taught = new Set([...content.lessons.values()].flatMap((l) => l.breeds));
    for (const slug of content.breeds.keys()) expect(taught, slug).toContain(slug);
  });

  it("every lesson quiz has at least five items", () => {
    for (const lesson of content.lessons.values()) {
      expect(lesson.quiz.length, lesson.id).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("integrity checks", () => {
  const curriculum = content.curriculum;
  const breeds = [...content.breeds.values()];
  const lessons = [...content.lessons.values()];

  it("passes for the shipped content", () => {
    expect(checkIntegrity(curriculum, breeds, lessons)).toEqual([]);
  });

  it("catches unknown breeds, bad prerequisites and cycles", () => {
    const [first, second] = content.lessonOrder.map((id) => content.lessons.get(id)!);
    const broken: Lesson[] = lessons.map((l) => {
      if (l.id === first.id) return { ...l, prerequisites: [second.id], breeds: ["not-a-breed"] };
      if (l.id === second.id) return { ...l, prerequisites: [first.id] };
      return l;
    });
    const problems = checkIntegrity(curriculum, breeds, broken).join("\n");
    expect(problems).toMatch(/unknown breed 'not-a-breed'/);
    expect(problems).toMatch(/comes later in the curriculum/);
    expect(problems).toMatch(/prerequisite cycle/);
  });

  it("catches photos filed under the wrong breed", () => {
    const pug = content.breeds.get("pug")!;
    const wrong: Breed = {
      ...pug,
      images: [...pug.images, { url: "https://images.dog.ceo/breeds/beagle/x.jpg", note: "", reviewed: false }],
    };
    const problems = checkIntegrity(curriculum, breeds.map((b) => (b.slug === "pug" ? wrong : b)), lessons);
    expect(problems.join("\n")).toMatch(/is not under https:\/\/images.dog.ceo\/breeds\/pug\//);
  });

  it("checks photos written in a lesson body", () => {
    const lesson = lessons.find((l) => l.breeds.includes("pug"))!;
    const pinned = content.breeds.get("pug")!.images[0].url;
    const withBody = (body: string) =>
      checkIntegrity(curriculum, breeds, lessons.map((l) => (l.id === lesson.id ? { ...l, body } : l))).join("\n");

    expect(withBody(`## Pug\n\n![Pug: wrinkled face](${pinned})\n`)).toBe("");
    expect(withBody(`![Pug](https://images.dog.ceo/breeds/pug/not-pinned.jpg)`)).toMatch(/is not a pinned photo/);
    expect(withBody(`![](${pinned})`)).toMatch(/needs alt text/);
  });

  it("catches traits that cite a missing source", () => {
    const pug = content.breeds.get("pug")!;
    const wrong: Breed = { ...pug, traits: [...pug.traits, { text: "Made up", source: "nowhere" }] };
    const problems = checkIntegrity(curriculum, breeds.map((b) => (b.slug === "pug" ? wrong : b)), lessons);
    expect(problems.join("\n")).toMatch(/unknown source 'nowhere'/);
  });
});

describe("schema validation", () => {
  it("rejects a breed without sources", () => {
    expect(() =>
      parseBreed(
        "slug: x\nname: X\ndogCeoPath: pug\ngroup: toy\nsize: toy\norigin: Y\nsummary: Z\ntraits: []\nsources: []\nimages: []\n",
        "x.yaml",
      ),
    ).toThrow(/at least one source/);
  });

  it("rejects a quiz question whose answer is not a choice", () => {
    const md = `---
id: x
title: X
unit: basics
summary: S
objectives: [O]
quiz:
  - { type: question, prompt: P, choices: [A, B], answer: C }
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
---
Body`;
    expect(() => parseLesson(md, "x.md")).toThrow(/answer must be one of the choices/);
  });

  it("rejects a lesson quiz with fewer than five items", () => {
    const md = `---
id: x
title: X
unit: basics
summary: S
objectives: [O]
quiz:
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
  - { type: identify, breed: pug }
---
Body`;
    expect(() => parseLesson(md, "x.md")).toThrow(/at least five items/);
  });

  it("rejects a lesson without frontmatter", () => {
    expect(() => parseLesson("# Just text", "x.md")).toThrow(/frontmatter/);
  });
});
