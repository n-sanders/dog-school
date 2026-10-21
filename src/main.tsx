import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { CurriculumPage } from "./pages/CurriculumPage";
import { LessonPage } from "./pages/LessonPage";
import { PracticePage } from "./pages/PracticePage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { BreedsPage } from "./pages/BreedsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<CurriculumPage />} />
          <Route path="lesson/:lessonId" element={<LessonPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="breeds" element={<BreedsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
