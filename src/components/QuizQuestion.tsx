import { useEffect, useState } from "react";
import type { Question } from "../lib/quiz";
import { isCorrect } from "../lib/quiz";
import { DogImage } from "./DogImage";

interface Props {
  question: Question;
  onAnswered: (correct: boolean, answer: string) => void;
  onNext: () => void;
  onImageError: (url: string) => void;
  nextLabel?: string;
}

function choiceKeys(q: Question): string[] {
  if (q.kind === "text") return q.choices;
  return q.choices.map((c) => ("breed" in c ? c.breed.slug : c.slug));
}

export function QuizQuestion({ question, onAnswered, onNext, onImageError, nextLabel = "Next" }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const answered = chosen !== null;
  const keys = choiceKeys(question);

  const choose = (key: string) => {
    if (answered) return;
    setChosen(key);
    onAnswered(isCorrect(question, key), key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const n = Number(e.key);
      if (!answered && n >= 1 && n <= keys.length) choose(keys[n - 1]);
      else if (answered && e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const correctKey = question.kind === "text" ? question.answer : question.breed.slug;
  const stateClass = (key: string) =>
    !answered ? "" : key === correctKey ? "correct" : key === chosen ? "wrong" : "dim";

  return (
    <div className="question" aria-live="polite">
      {question.kind === "identify" && (
        <>
          <h3 className="prompt">Which breed is this?</h3>
          <DogImage
            className="quiz-photo"
            src={question.image}
            alt={answered ? question.breed.name : "Photo of a dog to identify"}
            hideSource={!answered}
            onError={() => onImageError(question.image)}
          />
          <div className="choices" role="group" aria-label="Choices">
            {question.choices.map((b, i) => (
              <button
                key={b.slug}
                className={`choice ${stateClass(b.slug)}`}
                onClick={() => choose(b.slug)}
                disabled={answered}
              >
                <kbd>{i + 1}</kbd> {b.name}
              </button>
            ))}
          </div>
        </>
      )}

      {question.kind === "find" && (
        <>
          <h3 className="prompt">Find the {question.breed.name}</h3>
          <div className="photo-choices" role="group" aria-label="Choices">
            {question.choices.map((c, i) => (
              <button
                key={c.breed.slug}
                className={`photo-choice ${stateClass(c.breed.slug)}`}
                onClick={() => choose(c.breed.slug)}
                disabled={answered}
                aria-label={answered ? c.breed.name : `Photo ${i + 1}`}
              >
                <DogImage
                  src={c.image}
                  alt={answered ? c.breed.name : `Photo ${i + 1}`}
                  hideSource
                  onError={() => onImageError(c.image)}
                />
                <span className="photo-label">
                  <kbd>{i + 1}</kbd> {answered ? c.breed.name : ""}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {question.kind === "text" && (
        <>
          <h3 className="prompt">{question.prompt}</h3>
          <div className="choices" role="group" aria-label="Choices">
            {question.choices.map((c, i) => (
              <button key={c} className={`choice ${stateClass(c)}`} onClick={() => choose(c)} disabled={answered}>
                <kbd>{i + 1}</kbd> {c}
              </button>
            ))}
          </div>
        </>
      )}

      {answered && (
        <div className={`feedback ${chosen === correctKey ? "good" : "bad"}`}>
          <Feedback question={question} chosen={chosen} />
          <button className="btn primary" onClick={onNext} autoFocus>
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function Feedback({ question, chosen }: { question: Question; chosen: string }) {
  if (question.kind === "text") {
    const right = chosen === question.answer;
    return (
      <div>
        <strong>{right ? "Correct!" : `Not quite. The answer is "${question.answer}".`}</strong>
        {question.explanation && <p>{question.explanation}</p>}
      </div>
    );
  }
  const right = chosen === question.breed.slug;
  const picked =
    question.kind === "identify"
      ? question.choices.find((b) => b.slug === chosen)
      : question.choices.find((c) => c.breed.slug === chosen)?.breed;
  return (
    <div>
      <strong>
        {right
          ? `Correct! That's a ${question.breed.name}.`
          : question.kind === "identify"
            ? `Not quite. This is a ${question.breed.name}, not a ${picked?.name}.`
            : `Not quite. You picked a ${picked?.name}.`}
      </strong>
      <p className="hint">Look for: {question.breed.traits.slice(0, 2).map((t) => t.text).join(" ")}</p>
    </div>
  );
}
