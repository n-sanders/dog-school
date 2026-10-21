import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { allBreeds, content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { PracticeSession } from "../components/PracticeSession";
import { studiedBreeds } from "../lib/learning";
import { BOX_INTERVAL_DAYS, MAX_BOX, dueBreeds, nextDue } from "../lib/progress";

export function ReviewPage() {
  const { progress } = useProgress();
  const [session, setSession] = useState(0);
  const due = dueBreeds(progress);
  const queue = useRef<string[]>([]);

  const studied = studiedBreeds(content, progress);
  // Fixed for the length of a session so answering doesn't restart it.
  const pool = useMemo(() => (studied.length >= 4 ? studied : allBreeds()), [session]);

  const nextTarget = useCallback(() => {
    const slug = queue.current.shift();
    return slug ? content.breeds.get(slug)! : null;
  }, []);

  const start = () => {
    queue.current = [...due];
    setSession((s) => s + 1);
  };

  const upcoming = nextDue(progress);
  const boxes = Array.from({ length: MAX_BOX }, (_, i) => i + 1).map((box) => ({
    box,
    breeds: Object.entries(progress.breeds)
      .filter(([, s]) => s.box === box)
      .map(([slug]) => content.breeds.get(slug)?.name ?? slug),
  }));

  return (
    <div>
      <h1>Review</h1>
      <p className="muted">
        Every breed you answer about goes into a review box. Right answers move it up a box so it comes back less
        often; a wrong answer sends it back to box 1, so it comes back right away.
      </p>

      {session > 0 ? (
        <PracticeSession
          key={session}
          pool={pool}
          mode="identify"
          nextTarget={nextTarget}
          onAnswered={(breed, correct) => {
            if (!correct) queue.current.push(breed.slug);
          }}
          emptyMessage={
            <>
              <h3>Review complete!</h3>
              <p>
                Nice work. <button className="btn small" onClick={() => setSession(0)}>Back to review overview</button>
              </p>
            </>
          }
        />
      ) : due.length ? (
        <div className="card">
          <p>
            <strong>{due.length}</strong> breed{due.length === 1 ? " is" : "s are"} due for review.
          </p>
          <button className="btn primary" onClick={start}>
            Start review
          </button>
        </div>
      ) : (
        <div className="card">
          {Object.keys(progress.breeds).length === 0 ? (
            <p>
              Nothing to review yet. Answer some questions in a <Link to="/learn">lesson</Link> or in{" "}
              <Link to="/practice">Practice</Link> first.
            </p>
          ) : (
            <p>
              Nothing is due right now.{" "}
              {upcoming && <>The next review is due {upcoming.toLocaleString()}.</>}
            </p>
          )}
        </div>
      )}

      <section className="card">
        <h2>Your review boxes</h2>
        <div className="boxes">
          {boxes.map(({ box, breeds }) => (
            <div key={box} className="box">
              <h3>Box {box}</h3>
              <p className="muted small">
                {BOX_INTERVAL_DAYS[box] === 0 ? "Due right away" : `Due every ${BOX_INTERVAL_DAYS[box]} day(s)`}
              </p>
              {breeds.length ? (
                <ul>
                  {breeds.sort().map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">Empty</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
