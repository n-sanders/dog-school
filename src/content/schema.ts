import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");

export const AKC_GROUPS = [
  "sporting",
  "hound",
  "working",
  "terrier",
  "toy",
  "non-sporting",
  "herding",
] as const;

export const SIZES = ["toy", "small", "medium", "large", "giant"] as const;

export const SourceSchema = z.object({
  id: slug,
  title: z.string().min(1),
  url: z.url(),
});

export const PinnedImageSchema = z.object({
  url: z.url().startsWith("https://images.dog.ceo/breeds/"),
  note: z.string().default(""),
  reviewed: z.boolean().default(false),
});

export const BreedSchema = z.object({
  slug,
  name: z.string().min(1),
  dogCeoPath: z.string().regex(/^[a-z]+(\/[a-z]+)?$/, "must look like 'breed' or 'breed/sub'"),
  group: z.enum(AKC_GROUPS),
  size: z.enum(SIZES),
  origin: z.string().min(1),
  summary: z.string().min(1),
  traits: z
    .array(z.object({ text: z.string().min(1), source: slug }))
    .min(2, "each breed needs at least two identifying traits"),
  lookAlikes: z.array(slug).default([]),
  sources: z.array(SourceSchema).min(1, "each breed needs at least one source"),
  images: z.array(PinnedImageSchema).min(3, "pin at least three images per breed"),
  reviewedBy: z.string().default(""),
  reviewedOn: z.string().default(""),
});

const IdentifyItem = z.object({
  type: z.literal("identify"),
  breed: slug,
  image: z.url().optional(),
  distractors: z.array(slug).optional(),
});

const FindItem = z.object({
  type: z.literal("find"),
  breed: slug,
  distractors: z.array(slug).optional(),
});

const QuestionItem = z
  .object({
    type: z.literal("question"),
    prompt: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2),
    answer: z.string().min(1),
    explanation: z.string().optional(),
  })
  .refine((q) => q.choices.includes(q.answer), {
    message: "answer must be one of the choices",
    path: ["answer"],
  });

export const QuizItemSchema = z.discriminatedUnion("type", [IdentifyItem, FindItem, QuestionItem]);

export const LessonImageSchema = z.object({
  breed: slug,
  url: z.url().startsWith("https://images.dog.ceo/breeds/"),
  caption: z.string().min(1),
});

export const LessonFrontmatterSchema = z.object({
  id: slug,
  title: z.string().min(1),
  unit: slug,
  summary: z.string().min(1),
  prerequisites: z.array(slug).default([]),
  objectives: z.array(z.string().min(1)).min(1),
  breeds: z.array(slug).default([]),
  images: z.array(LessonImageSchema).default([]),
  compare: z.array(z.tuple([slug, slug])).default([]),
  sources: z.array(SourceSchema).default([]),
  quiz: z.array(QuizItemSchema).min(5, "each lesson quiz needs at least five items"),
  passMark: z.number().min(0).max(1).default(0.8),
  reviewedBy: z.string().default(""),
  reviewedOn: z.string().default(""),
});

export const CurriculumSchema = z.object({
  title: z.string(),
  units: z
    .array(
      z.object({
        id: slug,
        title: z.string().min(1),
        description: z.string().min(1),
        lessons: z.array(slug).min(1),
      }),
    )
    .min(1),
});

export type Source = z.infer<typeof SourceSchema>;
export type PinnedImage = z.infer<typeof PinnedImageSchema>;
export type Breed = z.infer<typeof BreedSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type LessonImage = z.infer<typeof LessonImageSchema>;
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
export type Lesson = LessonFrontmatter & { body: string; file: string };
export type Curriculum = z.infer<typeof CurriculumSchema>;
export type Unit = Curriculum["units"][number];
