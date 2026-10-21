import { useState } from "react";
import type { Lesson } from "../content/schema";
import { useProgress } from "../hooks/useProgress";
import { lessonStatus } from "../lib/progress";

/**
 * Lets the learner mark a lesson complete or not complete by hand, for example
 * after their browser data was cleared. Always asks for confirmation first.
 */
export function LessonStatusToggle({ lesson, compact }: { lesson: Lesson; compact?: boolean }) {
  const { progress, store } = useProgress();
  const [confirming, setConfirming] = useState(false);
  const status = lessonStatus(progress, lesson);
  const completed = status === "completed";

  if (confirming) {
    return (
      <span className="toggle-confirm" role="group" aria-label="Confirm change">
        <span>{completed ? "Mark as not completed?" : "Mark as completed?"}</span>
        <button
          className="btn small primary"
          onClick={() => {
            store.setManualCompletion(lesson.id, !completed);
            setConfirming(false);
          }}
        >
          Yes
        </button>
        <button className="btn small" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      className={`btn small ${compact ? "ghost" : ""}`}
      onClick={() => setConfirming(true)}
      title={completed ? "Mark this lesson as not completed" : "Mark this lesson as completed without taking the quiz"}
    >
      {completed ? "Mark not completed" : "Mark completed"}
    </button>
  );
}
