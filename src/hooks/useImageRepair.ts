import { useCallback, useRef } from "react";
import type { ImageSource, Question } from "../lib/quiz";

/**
 * Returns a function that swaps a broken photo in a question for a different photo
 * of the same breed, so a failed download never counts against the learner.
 */
export function useImageRepair(images: ImageSource) {
  const failed = useRef(new Set<string>());
  return useCallback(
    async (question: Question, url: string): Promise<Question | null> => {
      if (failed.current.has(url)) return null;
      failed.current.add(url);
      if (question.kind === "identify" && question.image === url) {
        return { ...question, image: await images(question.breed, failed.current) };
      }
      if (question.kind === "find") {
        const choices = await Promise.all(
          question.choices.map(async (c) =>
            c.image === url ? { ...c, image: await images(c.breed, failed.current) } : c,
          ),
        );
        return { ...question, choices };
      }
      return null;
    },
    [images],
  );
}
