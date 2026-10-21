import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useProgress } from "../hooks/useProgress";
import { dueBreeds } from "../lib/progress";

export function Layout() {
  const { progress, store } = useProgress();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const due = dueBreeds(progress).length;
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <span aria-hidden="true">🐕</span> DogSchool
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/learn">Learn</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/review">
            Review{due > 0 && <span className="badge" aria-label={`${due} due`}>{due}</span>}
          </NavLink>
          <NavLink to="/breeds">Breeds</NavLink>
          <NavLink to="/progress">Progress</NavLink>
        </nav>
      </header>
      {store.loadError && (
        <div className="banner warning" role="alert">
          {store.loadError} <NavLink to="/progress">Go to Progress</NavLink>
        </div>
      )}
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        Photos from the <a href="https://dog.ceo/dog-api/">Dog CEO API</a>, mostly from the{" "}
        <a href="http://vision.stanford.edu/aditya86/ImageNetDogs/">Stanford Dogs Dataset</a>. Breed facts cite the{" "}
        <a href="https://www.akc.org/dog-breeds/">American Kennel Club</a>. Progress is saved only in this browser.
      </footer>
    </div>
  );
}
