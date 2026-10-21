import { buildContent, checkIntegrity, parseBreed, parseCurriculum, parseLesson } from "./parse";

const breedFiles = import.meta.glob<string>("/content/breeds/*.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});
const lessonFiles = import.meta.glob<string>("/content/lessons/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const curriculumFiles = import.meta.glob<string>("/content/curriculum.yaml", {
  query: "?raw",
  import: "default",
  eager: true,
});

function load() {
  const [curriculumFile, curriculumRaw] = Object.entries(curriculumFiles)[0];
  const curriculum = parseCurriculum(curriculumRaw, curriculumFile);
  const breeds = Object.entries(breedFiles).map(([file, raw]) => parseBreed(raw, file));
  const lessons = Object.entries(lessonFiles).map(([file, raw]) => parseLesson(raw, file));
  const problems = checkIntegrity(curriculum, breeds, lessons);
  if (problems.length) {
    throw new Error(`Content failed integrity checks:\n${problems.join("\n")}`);
  }
  return buildContent(curriculum, breeds, lessons);
}

export const content = load();

export function getLesson(id: string) {
  return content.lessons.get(id);
}

export function getBreed(slug: string) {
  return content.breeds.get(slug);
}

export function allBreeds() {
  return [...content.breeds.values()].sort((a, b) => a.name.localeCompare(b.name));
}
