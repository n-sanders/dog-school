import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseBreed, parseCurriculum, parseLesson, ContentError } from "../../src/content/parse";
import type { Breed, Curriculum, Lesson } from "../../src/content/schema";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const CONTENT_DIR = join(ROOT, "content");
export const BREEDS_DIR = join(CONTENT_DIR, "breeds");
export const LESSONS_DIR = join(CONTENT_DIR, "lessons");

export const rel = (p: string) => relative(ROOT, p).replaceAll("\\", "/");

export function listFiles(dir: string, ext: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .sort()
    .map((f) => join(dir, f));
}

export interface LoadedContent {
  curriculum?: Curriculum;
  breeds: Breed[];
  lessons: Lesson[];
  errors: string[];
}

/** Reads every content file, collecting parse errors instead of stopping at the first one. */
export function readAllContent(): LoadedContent {
  const errors: string[] = [];
  const attempt = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (e) {
      errors.push(e instanceof ContentError ? e.message : String(e));
      return undefined;
    }
  };
  const curriculumPath = join(CONTENT_DIR, "curriculum.yaml");
  const curriculum = attempt(() =>
    parseCurriculum(readFileSync(curriculumPath, "utf8"), rel(curriculumPath)),
  );
  const breeds = listFiles(BREEDS_DIR, ".yaml")
    .map((f) => attempt(() => parseBreed(readFileSync(f, "utf8"), rel(f))))
    .filter((b): b is Breed => !!b);
  const lessons = listFiles(LESSONS_DIR, ".md")
    .map((f) => attempt(() => parseLesson(readFileSync(f, "utf8"), rel(f))))
    .filter((l): l is Lesson => !!l);
  return { curriculum, breeds, lessons, errors };
}
