import { useEffect, useState } from "react";
import type { Lesson } from "../content/schema";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { useImageRepair } from "../hooks/useImageRepair";
import { pinnedImages } from "../lib/learning";
import { buildLessonQuiz, type Question } from "../lib/quiz";
import { QuizQuestion } from "./QuizQuestion";

type Phase = { name: "loading" } | { name: "running"; index: number } | { name: "done" };

export function LessonQuiz({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { store } = useProgress();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [correct, setCorrect] = useState(0);
  const repair = useImageRepair(pinnedImages);

  useEffect(() => {
    let cancelled = false;
    buildLessonQuiz(lesson, content.breeds, pinnedImages).then((qs) => {
      if (cancelled) return;
      setQuestions(qs);
      setPhase({ name: "running", index: 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [lesson]);

  if (phase.name === "loading") return <p>Preparing quiz...</p>;

  if (phase.name === "done") {
    const score = correct / questions.length;
    const passed = score >= lesson.passMark;
    return (
      <div className={`card result ${passed ? "good" : "bad"}`}>
        <h3>{passed ? "Lesson complete!" : "Keep practicing"}</h3>
        <p>
          You scored {correct} out of {questions.length} ({Math.round(score * 100)}%).{" "}
          {passed
            ? "Great work - the next lesson is unlocked."
            : `You need ${Math.round(lesson.passMark * 100)}% to complete this lesson. Review the breeds above and try again.`}
        </p>
        <button className="btn" onClick={onClose}>
          Close quiz
        </button>
      </div>
    );
  }

  const q = questions[phase.index];
  const last = phase.index === questions.length - 1;
  return (
    <div className="card quiz">
      <p className="quiz-progress">
        Question {phase.index + 1} of {questions.length} · {correct} correct
      </p>
      <QuizQuestion
        key={q.key}
        question={q}
        nextLabel={last ? "See results" : "Next question"}
        onAnswered={(ok) => {
          if (ok) setCorrect((c) => c + 1);
          if (q.kind !== "text") store.recordAnswer(q.breed.slug, ok);
          if (last) store.recordQuiz(lesson.id, (correct + (ok ? 1 : 0)) / questions.length, lesson.passMark);
        }}
        onNext={() => setPhase(last ? { name: "done" } : { name: "running", index: phase.index + 1 })}
        onImageError={async (url) => {
          const fixed = await repair(q, url);
          if (fixed) setQuestions((qs) => qs.map((x) => (x.key === q.key ? fixed : x)));
        }}
      />
    </div>
  );
}
