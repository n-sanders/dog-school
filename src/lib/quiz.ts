import type { Breed, Lesson, QuizItem } from "../content/schema";
import { pickRandom, shuffle, type Rng } from "./random";

export type ImageSource = (breed: Breed, exclude: Set<string>) => Promise<string>;

export type Question =
  | { kind: "identify"; key: string; breed: Breed; image: string; choices: Breed[] }
  | { kind: "find"; key: string; breed: Breed; choices: { breed: Breed; image: string }[] }
  | { kind: "text"; key: string; prompt: string; choices: string[]; answer: string; explanation?: string };

/**
 * Picks wrong answers that are plausible rather than random. Tiers, in order:
 * explicit distractors, look-alikes, same AKC group, other breeds in the pool,
 * then anything else. Breeds are shuffled within each tier.
 */
export function pickDistractors(
  target: Breed,
  pool: Breed[],
  all: Breed[],
  count = 3,
  explicit: string[] = [],
  rng: Rng = Math.random,
): Breed[] {
  const bySlug = new Map(all.map((b) => [b.slug, b]));
  const poolSlugs = new Set(pool.map((b) => b.slug));
  const isLookAlike = (b: Breed) => target.lookAlikes.includes(b.slug) || b.lookAlikes.includes(target.slug);
  const tiers: Breed[][] = [
    explicit.map((s) => bySlug.get(s)).filter((b): b is Breed => !!b),
    shuffle(pool.filter(isLookAlike), rng),
    shuffle(pool.filter((b) => b.group === target.group), rng),
    shuffle(pool, rng),
    shuffle(all.filter((b) => !poolSlugs.has(b.slug) && isLookAlike(b)), rng),
    shuffle(all.filter((b) => !poolSlugs.has(b.slug) && b.group === target.group), rng),
    shuffle(all, rng),
  ];
  const chosen = new Map<string, Breed>();
  for (const tier of tiers) {
    for (const b of tier) {
      if (chosen.size >= count) break;
      if (b.slug !== target.slug) chosen.set(b.slug, b);
    }
  }
  return [...chosen.values()];
}

async function buildIdentify(
  key: string,
  breed: Breed,
  distractors: Breed[],
  images: ImageSource,
  rng: Rng,
  fixedImage?: string,
): Promise<Question> {
  const image = fixedImage ?? (await images(breed, new Set()));
  return { kind: "identify", key, breed, image, choices: shuffle([breed, ...distractors], rng) };
}

async function buildFind(
  key: string,
  breed: Breed,
  distractors: Breed[],
  images: ImageSource,
  rng: Rng,
): Promise<Question> {
  const used = new Set<string>();
  const choices = [];
  for (const b of shuffle([breed, ...distractors], rng)) {
    const image = await images(b, used);
    used.add(image);
    choices.push({ breed: b, image });
  }
  return { kind: "find", key, breed, choices };
}

/** Turns a lesson's authored quiz items into concrete questions using pinned photos. */
export async function buildLessonQuiz(
  lesson: Lesson,
  breeds: Map<string, Breed>,
  images: ImageSource,
  rng: Rng = Math.random,
): Promise<Question[]> {
  const all = [...breeds.values()];
  const pool = lesson.breeds.map((s) => breeds.get(s)!).filter(Boolean);
  const questions: Question[] = [];
  const usedTargetImages = new Set<string>();
  for (const [i, item] of lesson.quiz.entries()) {
    questions.push(await buildFromItem(`${lesson.id}:${i}`, item));
  }
  return questions;

  async function buildFromItem(key: string, item: QuizItem): Promise<Question> {
    if (item.type === "question") {
      return {
        kind: "text",
        key,
        prompt: item.prompt,
        choices: shuffle(item.choices, rng),
        answer: item.answer,
        explanation: item.explanation,
      };
    }
    const breed = breeds.get(item.breed)!;
    const distractors = pickDistractors(breed, pool, all, 3, item.distractors, rng);
    if (item.type === "identify") {
      // Avoid showing the same photo twice when a breed appears in several items.
      const image = item.image ?? (await images(breed, usedTargetImages));
      usedTargetImages.add(image);
      return buildIdentify(key, breed, distractors, images, rng, image);
    }
    return buildFind(key, breed, distractors, images, rng);
  }
}

/** Builds one practice question about `target`, with wrong answers drawn from `pool`. */
export async function buildPracticeQuestion(
  kind: "identify" | "find",
  target: Breed,
  pool: Breed[],
  all: Breed[],
  images: ImageSource,
  rng: Rng = Math.random,
): Promise<Question> {
  const distractors = pickDistractors(target, pool, all, 3, [], rng);
  const key = `${kind}:${target.slug}:${Math.floor(rng() * 1e9)}`;
  return kind === "identify"
    ? buildIdentify(key, target, distractors, images, rng)
    : buildFind(key, target, distractors, images, rng);
}

/** Chooses a practice target, favoring breeds the learner gets wrong more often. */
export function pickPracticeTarget(
  pool: Breed[],
  accuracy: (slug: string) => number | undefined,
  avoid: string | undefined,
  rng: Rng = Math.random,
): Breed {
  const candidates = pool.length > 1 ? pool.filter((b) => b.slug !== avoid) : pool;
  const weights = candidates.map((b) => {
    const acc = accuracy(b.slug);
    return acc === undefined ? 1.5 : 0.5 + (1 - acc) * 2;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const [i, w] of weights.entries()) {
    r -= w;
    if (r <= 0) return candidates[i];
  }
  return pickRandom(candidates, rng);
}

export function isCorrect(question: Question, answer: string): boolean {
  return question.kind === "text" ? answer === question.answer : answer === question.breed.slug;
}
