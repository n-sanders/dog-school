import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p>
        That page does not exist. <Link to="/learn">Go to the lessons</Link>.
      </p>
    </div>
  );
}
