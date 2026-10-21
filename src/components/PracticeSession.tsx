import { useCallback, useEffect, useRef, useState } from "react";
import type { Breed } from "../content/schema";
import { allBreeds } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { useImageRepair } from "../hooks/useImageRepair";
import { liveImages } from "../lib/learning";
import { buildPracticeQuestion, type Question } from "../lib/quiz";
import { QuizQuestion } from "./QuizQuestion";

export type PracticeMode = "identify" | "find" | "mixed";

interface Props {
  /** Breeds used for wrong answers. */
  pool: Breed[];
  mode: PracticeMode;
  /** Returns the next breed to ask about, or null when the session is over. */
  nextTarget: (previous: string | undefined) => Breed | null;
  /** Called after each answer, after progress has been recorded. */
  onAnswered?: (breed: Breed, correct: boolean) => void;
  emptyMessage?: React.ReactNode;
}

function preload(q: Question) {
  const urls = q.kind === "identify" ? [q.image] : q.kind === "find" ? q.choices.map((c) => c.image) : [];
  for (const u of urls) new Image().src = u;
}

export function PracticeSession({ pool, mode, nextTarget, onAnswered, emptyMessage }: Props) {
  const { store } = useProgress();
  const [current, setCurrent] = useState<Question | null | undefined>(undefined);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const upcoming = useRef<Promise<Question | null> | null>(null);
  const repair = useImageRepair(liveImages);

  const build = useCallback(
    (previous: string | undefined): Promise<Question | null> => {
      const target = nextTarget(previous);
      if (!target) return Promise.resolve(null);
      const kind = mode === "mixed" ? (Math.random() < 0.5 ? "identify" : "find") : mode;
      return buildPracticeQuestion(kind, target, pool, allBreeds(), liveImages).then((q) => {
        preload(q);
        return q;
      });
    },
    [nextTarget, mode, pool],
  );

  // nextTarget may consume a queue, so the first question is built once per `build`
  // even when React runs this effect twice.
  const first = useRef<{ build: typeof build; question: Promise<Question | null> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCurrent(undefined);
    setScore({ correct: 0, total: 0 });
    if (first.current?.build !== build) first.current = { build, question: build(undefined) };
    first.current.question.then((q) => !cancelled && setCurrent(q));
    return () => {
      cancelled = true;
    };
  }, [build]);

  if (current === undefined) return <p>Fetching photos...</p>;
  if (current === null) return <div className="card">{emptyMessage ?? "Nothing to practice right now."}</div>;

  const q = current;
  return (
    <div className="card quiz">
      <p className="quiz-progress">
        This session: {score.correct} correct out of {score.total}
      </p>
      <QuizQuestion
        key={q.key}
        question={q}
        onAnswered={(ok) => {
          if (q.kind === "text") return;
          store.recordAnswer(q.breed.slug, ok);
          setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
          onAnswered?.(q.breed, ok);
          upcoming.current = build(q.breed.slug);
        }}
        onNext={async () => {
          const next = await (upcoming.current ?? build(q.kind === "text" ? undefined : q.breed.slug));
          upcoming.current = null;
          setCurrent(next);
        }}
        onImageError={async (url) => {
          const fixed = await repair(q, url);
          if (fixed) setCurrent((c) => (c?.key === q.key ? fixed : c));
        }}
      />
    </div>
  );
}
