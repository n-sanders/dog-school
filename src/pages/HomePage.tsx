import { Link } from "react-router";
import { content } from "../content/loader";
import { useProgress } from "../hooks/useProgress";
import { completedCount, nextLessonId, studiedBreeds } from "../lib/learning";
import { dueBreeds } from "../lib/progress";

export function HomePage() {
  const { progress } = useProgress();
  const done = completedCount(content, progress);
  const total = content.lessonOrder.length;
  const next = nextLessonId(content, progress);
  const nextLesson = next ? content.lessons.get(next) : undefined;
  const studied = studiedBreeds(content, progress).length;
  const due = dueBreeds(progress).length;

  return (
    <div className="home">
      <section className="hero">
        <h1>Learn to identify dog breeds</h1>
        <p>
          Work through short lessons with real photos, then practice until you can name {content.breeds.size}{" "}
          breeds at a glance.
        </p>
        {nextLesson ? (
          <Link className="btn primary large" to={`/lesson/${nextLesson.id}`}>
            {done === 0 ? "Start the first lesson" : `Continue: ${nextLesson.title}`}
          </Link>
        ) : (
          <p className="banner good">You have completed every lesson. Congratulations, DogSchool graduate!</p>
        )}
      </section>

      <section className="stats" aria-label="Your progress">
        <div className="stat">
          <span className="stat-value">
            {done}/{total}
          </span>
          <span className="stat-label">lessons completed</span>
          <div className="meter" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
        <div className="stat">
          <span className="stat-value">{studied}</span>
          <span className="stat-label">breeds studied</span>
          <Link to="/practice">Practice them</Link>
        </div>
        <div className="stat">
          <span className="stat-value">{due}</span>
          <span className="stat-label">breeds due for review</span>
          <Link to="/review">Start review</Link>
        </div>
      </section>

      <section className="how card">
        <h2>How DogSchool works</h2>
        <ol>
          <li>
            <strong>Learn.</strong> Each lesson teaches a few breeds and the clues that tell them apart. Pass its
            quiz with 80% to unlock the next lesson.
          </li>
          <li>
            <strong>Practice.</strong> Quiz yourself on fresh photos of breeds you have studied.
          </li>
          <li>
            <strong>Review.</strong> Breeds you miss come back sooner, so you spend time where you need it.
          </li>
        </ol>
        <p className="muted">
          Lost your progress? Open any lesson or the <Link to="/progress">Progress</Link> page and use{" "}
          <em>Mark completed</em>.
        </p>
      </section>
    </div>
  );
}
