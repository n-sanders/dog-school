import type { Content } from "../content/parse";
import type { Breed } from "../content/schema";
import { randomLiveImage, randomPinnedImage } from "./dogApi";
import { isCompleted, lessonStatus, type Progress } from "./progress";
import type { ImageSource } from "./quiz";

export const pinnedImages: ImageSource = (breed, exclude) => Promise.resolve(randomPinnedImage(breed, exclude));
export const liveImages: ImageSource = (breed, exclude) => randomLiveImage(breed, exclude);

/** Breeds taught in lessons the learner has completed (by quiz or by hand). */
export function studiedBreeds(content: Content, progress: Progress): Breed[] {
  const slugs = new Set<string>();
  for (const id of content.lessonOrder) {
    if (isCompleted(progress, id)) content.lessons.get(id)!.breeds.forEach((s) => slugs.add(s));
  }
  return [...slugs].map((s) => content.breeds.get(s)!).sort((a, b) => a.name.localeCompare(b.name));
}

/** The first lesson in curriculum order that is unlocked but not yet completed. */
export function nextLessonId(content: Content, progress: Progress): string | undefined {
  return content.lessonOrder.find((id) => lessonStatus(progress, content.lessons.get(id)!) === "available");
}

export function completedCount(content: Content, progress: Progress): number {
  return content.lessonOrder.filter((id) => isCompleted(progress, id)).length;
}

export function isStanfordImage(url: string): boolean {
  return /\/n\d{8}_\d+\.jpe?g$/i.test(url);
}

export const GROUP_LABELS: Record<Breed["group"], string> = {
  sporting: "Sporting",
  hound: "Hound",
  working: "Working",
  terrier: "Terrier",
  toy: "Toy",
  "non-sporting": "Non-sporting",
  herding: "Herding",
};
