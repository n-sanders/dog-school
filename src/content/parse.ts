import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  BreedSchema,
  CurriculumSchema,
  LessonFrontmatterSchema,
  type Breed,
  type Curriculum,
  type Lesson,
  type Unit,
} from "./schema";

export class ContentError extends Error {
  constructor(
    public file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(raw: string, file: string): { data: unknown; body: string } {
  const match = FRONTMATTER.exec(raw);
  if (!match) throw new ContentError(file, "missing '---' frontmatter block");
  return { data: parseYaml(match[1]), body: match[2].trim() };
}

function validate<T>(schema: ZodType<T>, data: unknown, file: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ContentError(file, `schema errors:\n${issues}`);
  }
  return result.data;
}

export function parseBreed(raw: string, file: string): Breed {
  return validate(BreedSchema, parseYaml(raw), file);
}

export function parseLesson(raw: string, file: string): Lesson {
  const { data, body } = splitFrontmatter(raw, file);
  if (!body) throw new ContentError(file, "lesson body is empty");
  return { ...validate(LessonFrontmatterSchema, data, file), body, file };
}

export function parseCurriculum(raw: string, file: string): Curriculum {
  return validate(CurriculumSchema, parseYaml(raw), file);
}

export interface Content {
  curriculum: Curriculum;
  breeds: Map<string, Breed>;
  lessons: Map<string, Lesson>;
  /** Lesson ids in curriculum order. */
  lessonOrder: string[];
  unitOf: Map<string, Unit>;
}

export function buildContent(curriculum: Curriculum, breeds: Breed[], lessons: Lesson[]): Content {
  const breedMap = new Map(breeds.map((b) => [b.slug, b]));
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const unitOf = new Map<string, Unit>();
  const lessonOrder: string[] = [];
  for (const unit of curriculum.units) {
    for (const id of unit.lessons) {
      lessonOrder.push(id);
      unitOf.set(id, unit);
    }
  }
  return { curriculum, breeds: breedMap, lessons: lessonMap, lessonOrder, unitOf };
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

/** Markdown images (`![alt](url)`) written in a lesson body. */
export function bodyImages(body: string): { alt: string; url: string }[] {
  return [...body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ alt: m[1], url: m[2] }));
}

/** Dog CEO stores `breed/sub` images under `/breeds/breed-sub/`. */
export function imageFolderFor(dogCeoPath: string): string {
  return `https://images.dog.ceo/breeds/${dogCeoPath.replace("/", "-")}/`;
}

/**
 * Cross-file checks that need no network access. Returns a list of problems;
 * an empty list means the content is consistent.
 */
export function checkIntegrity(
  curriculum: Curriculum,
  breeds: Breed[],
  lessons: Lesson[],
): string[] {
  const problems: string[] = [];
  const breedSlugs = new Set(breeds.map((b) => b.slug));
  const lessonIds = new Set(lessons.map((l) => l.id));
  const unitIds = new Set(curriculum.units.map((u) => u.id));
  const listed = curriculum.units.flatMap((u) => u.lessons);

  for (const d of duplicates(breeds.map((b) => b.slug))) problems.push(`duplicate breed slug '${d}'`);
  for (const d of duplicates(breeds.map((b) => b.dogCeoPath)))
    problems.push(`two breeds share Dog CEO path '${d}'`);
  for (const d of duplicates(lessons.map((l) => l.id))) problems.push(`duplicate lesson id '${d}'`);
  for (const d of duplicates(listed)) problems.push(`lesson '${d}' is listed more than once in curriculum`);
  for (const d of duplicates(curriculum.units.map((u) => u.id))) problems.push(`duplicate unit id '${d}'`);

  for (const id of listed) if (!lessonIds.has(id)) problems.push(`curriculum lists missing lesson '${id}'`);

  for (const breed of breeds) {
    const where = `breed '${breed.slug}'`;
    const sourceIds = new Set(breed.sources.map((s) => s.id));
    for (const t of breed.traits)
      if (!sourceIds.has(t.source)) problems.push(`${where}: trait cites unknown source '${t.source}'`);
    for (const la of breed.lookAlikes) {
      if (!breedSlugs.has(la)) problems.push(`${where}: unknown look-alike '${la}'`);
      if (la === breed.slug) problems.push(`${where}: lists itself as a look-alike`);
    }
    const folder = imageFolderFor(breed.dogCeoPath);
    for (const img of breed.images)
      if (!img.url.startsWith(folder)) problems.push(`${where}: image ${img.url} is not under ${folder}`);
    for (const d of duplicates(breed.images.map((i) => i.url))) problems.push(`${where}: duplicate image ${d}`);
  }

  const breedBySlug = new Map(breeds.map((b) => [b.slug, b]));
  for (const lesson of lessons) {
    const where = `lesson '${lesson.id}' (${lesson.file})`;
    if (!listed.includes(lesson.id)) problems.push(`${where}: not listed in curriculum`);
    if (!unitIds.has(lesson.unit)) problems.push(`${where}: unknown unit '${lesson.unit}'`);
    else if (!curriculum.units.find((u) => u.id === lesson.unit)!.lessons.includes(lesson.id))
      problems.push(`${where}: frontmatter unit '${lesson.unit}' does not match its curriculum unit`);
    for (const p of lesson.prerequisites) {
      if (!lessonIds.has(p)) problems.push(`${where}: unknown prerequisite '${p}'`);
      else if (listed.indexOf(p) > listed.indexOf(lesson.id))
        problems.push(`${where}: prerequisite '${p}' comes later in the curriculum`);
    }
    const checkBreed = (s: string, ctx: string) => {
      if (!breedSlugs.has(s)) problems.push(`${where}: ${ctx} references unknown breed '${s}'`);
    };
    lesson.breeds.forEach((b) => checkBreed(b, "breeds"));
    lesson.compare.forEach(([a, b]) => {
      checkBreed(a, "compare");
      checkBreed(b, "compare");
    });
    for (const img of lesson.images) {
      checkBreed(img.breed, "images");
      const breed = breedBySlug.get(img.breed);
      if (breed && !img.url.startsWith(imageFolderFor(breed.dogCeoPath)))
        problems.push(`${where}: image ${img.url} is not in the '${img.breed}' folder`);
    }
    const pinned = new Set(lesson.breeds.flatMap((s) => breedBySlug.get(s)?.images.map((i) => i.url) ?? []));
    for (const { alt, url } of bodyImages(lesson.body)) {
      if (!alt.trim()) problems.push(`${where}: body image ${url} needs alt text (it is shown as the caption)`);
      if (!pinned.has(url))
        problems.push(`${where}: body image ${url} is not a pinned photo of a breed in this lesson's 'breeds'`);
    }
    lesson.quiz.forEach((item, i) => {
      if (item.type === "question") return;
      checkBreed(item.breed, `quiz[${i}]`);
      item.distractors?.forEach((d) => checkBreed(d, `quiz[${i}].distractors`));
      if (item.distractors?.includes(item.breed))
        problems.push(`${where}: quiz[${i}] lists the answer as a distractor`);
      if (item.type === "identify" && item.image) {
        const breed = breedBySlug.get(item.breed);
        if (breed && !item.image.startsWith(imageFolderFor(breed.dogCeoPath)))
          problems.push(`${where}: quiz[${i}] image is not in the '${item.breed}' folder`);
      }
    });
  }

  problems.push(...findCycles(lessons));
  return problems;
}

function findCycles(lessons: Lesson[]): string[] {
  const prereqs = new Map(lessons.map((l) => [l.id, l.prerequisites]));
  const state = new Map<string, "visiting" | "done">();
  const problems: string[] = [];
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      problems.push(`prerequisite cycle: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`);
      return;
    }
    state.set(id, "visiting");
    for (const p of prereqs.get(id) ?? []) visit(p, [...path, id]);
    state.set(id, "done");
  };
  for (const id of prereqs.keys()) visit(id, []);
  return problems;
}
