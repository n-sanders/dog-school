import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { allBreeds, content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { PracticeSession, type PracticeMode } from "../components/PracticeSession";
import { studiedBreeds } from "../lib/learning";
import { getProgressStore, accuracy } from "../lib/progress";
import { pickPracticeTarget } from "../lib/quiz";

type Scope = "studied" | "all";

export function PracticePage() {
  const { progress } = useProgress();
  const [mode, setMode] = useState<PracticeMode>("identify");
  const [scope, setScope] = useState<Scope>("studied");
  const [started, setStarted] = useState(false);

  const studiedSlugs = studiedBreeds(content, progress)
    .map((b) => b.slug)
    .join(",");
  // Only rebuild the pool when the set of breeds changes, not on every answer.
  const pool = useMemo(
    () => (scope === "all" ? allBreeds() : studiedSlugs ? studiedSlugs.split(",").map((s) => content.breeds.get(s)!) : []),
    [scope, studiedSlugs],
  );

  const nextTarget = useCallback(
    (previous: string | undefined) =>
      pool.length ? pickPracticeTarget(pool, (s) => accuracy(getProgressStore().getSnapshot(), s), previous) : null,
    [pool],
  );

  return (
    <div>
      <h1>Practice</h1>
      <p className="muted">
        Practice uses fresh photos from the Dog CEO API, so you see different dogs every time. Breeds you get wrong
        come up more often.
      </p>

      <div className="card controls">
        <fieldset>
          <legend>Question type</legend>
          {(
            [
              ["identify", "Identify: photo → breed name"],
              ["find", "Find: breed name → photo"],
              ["mixed", "Mixed"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} /> {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Breeds</legend>
          <label>
            <input type="radio" name="scope" checked={scope === "studied"} onChange={() => setScope("studied")} />{" "}
            Breeds I have studied ({studiedSlugs ? studiedSlugs.split(",").length : 0})
          </label>
          <label>
            <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} /> All{" "}
            {content.breeds.size} breeds (challenge)
          </label>
        </fieldset>
        {!started && (
          <button className="btn primary" onClick={() => setStarted(true)} disabled={pool.length < 2}>
            Start practicing
          </button>
        )}
      </div>

      {pool.length < 2 ? (
        <div className="card">
          Complete a lesson that teaches breeds (starting with{" "}
          <Link to="/lesson/companions-01-retrievers">Labrador and Golden Retrievers</Link>) to practice studied
          breeds, or choose <em>All breeds</em>.
        </div>
      ) : (
        started && <PracticeSession pool={pool} mode={mode} nextTarget={nextTarget} />
      )}
    </div>
  );
}
