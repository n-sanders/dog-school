import { useRef, useState } from "react";
import { Link } from "react-router";
import { allBreeds, content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { LessonStatusToggle } from "../components/LessonStatusToggle";
import { StatusBadge } from "../components/StatusBadge";
import { completedCount } from "../lib/learning";
import { lessonStatus } from "../lib/progress";

export function ProgressPage() {
  const { progress, store } = useProgress();
  const [message, setMessage] = useState<{ kind: "good" | "warning"; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportProgress = () => {
    const blob = new Blob([store.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dogschool-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: "good", text: "Progress backup downloaded." });
  };

  const importProgress = async (file: File) => {
    try {
      store.importJson(await file.text());
      setMessage({ kind: "good", text: `Progress restored from ${file.name}.` });
    } catch (e) {
      setMessage({ kind: "warning", text: e instanceof Error ? e.message : "Could not import that file." });
    }
  };

  const breedRows = allBreeds()
    .map((b) => ({ breed: b, stat: progress.breeds[b.slug] }))
    .filter((r) => r.stat);

  return (
    <div>
      <h1>Your progress</h1>
      <p className="muted">
        Progress is saved only in this browser. If it is ever lost, you can restore a backup below or mark lessons
        as completed by hand.
      </p>

      {message && (
        <div className={`banner ${message.kind}`} role="status">
          {message.text}
        </div>
      )}

      <section className="card">
        <h2>Backup and restore</h2>
        <div className="button-row">
          <button className="btn" onClick={exportProgress}>
            Download backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Restore from backup...
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importProgress(f);
              e.target.value = "";
            }}
          />
          {confirmReset ? (
            <span className="toggle-confirm">
              <span>Erase all progress?</span>
              <button
                className="btn small danger"
                onClick={() => {
                  store.reset();
                  setConfirmReset(false);
                  setMessage({ kind: "good", text: "All progress was erased." });
                }}
              >
                Yes, erase
              </button>
              <button className="btn small" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>
              Reset progress
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>
          Lessons ({completedCount(content, progress)}/{content.lessonOrder.length} completed)
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Lesson</th>
                <th scope="col">Status</th>
                <th scope="col">Best score</th>
                <th scope="col">Attempts</th>
                <th scope="col">Completed on</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {content.curriculum.units.flatMap((unit) => [
                <tr key={unit.id} className="unit-row">
                  <th colSpan={6} scope="rowgroup">
                    {unit.title}
                  </th>
                </tr>,
                ...unit.lessons.map((id) => {
                  const lesson = content.lessons.get(id)!;
                  const record = progress.lessons[id];
                  return (
                    <tr key={id}>
                      <td>
                        <Link to={`/lesson/${id}`}>{lesson.title}</Link>
                      </td>
                      <td>
                        <StatusBadge status={lessonStatus(progress, lesson)} record={record} />
                      </td>
                      <td>{record?.bestScore != null ? `${Math.round(record.bestScore * 100)}%` : "-"}</td>
                      <td>{record?.attempts ?? 0}</td>
                      <td>{record?.completed ? new Date(record.completed.at).toLocaleDateString() : "-"}</td>
                      <td>
                        <LessonStatusToggle lesson={lesson} compact />
                      </td>
                    </tr>
                  );
                }),
              ])}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Breed accuracy</h2>
        {breedRows.length === 0 ? (
          <p className="muted">No answers recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Breed</th>
                  <th scope="col">Correct</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Review box</th>
                </tr>
              </thead>
              <tbody>
                {breedRows.map(({ breed, stat }) => (
                  <tr key={breed.slug}>
                    <td>{breed.name}</td>
                    <td>
                      {stat.correct}/{stat.seen}
                    </td>
                    <td>
                      <div className="meter small-meter" aria-label={`${Math.round((stat.correct / stat.seen) * 100)}%`}>
                        <div style={{ width: `${(stat.correct / stat.seen) * 100}%` }} />
                      </div>
                    </td>
                    <td>{stat.box}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
