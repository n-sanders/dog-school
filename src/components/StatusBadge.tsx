import type { LessonRecord, LessonStatus } from "../lib/progress";

const LABELS: Record<LessonStatus, string> = {
  locked: "Locked",
  available: "Ready",
  completed: "Completed",
};

export function StatusBadge({ status, record }: { status: LessonStatus; record?: LessonRecord }) {
  const manual = status === "completed" && record?.completed?.method === "manual";
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true">{status === "completed" ? "✓" : status === "locked" ? "🔒" : "●"}</span>{" "}
      {manual ? "Marked manually" : LABELS[status]}
    </span>
  );
}
