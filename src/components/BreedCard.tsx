import type { Breed } from "../content/schema";
import { GROUP_LABELS } from "../lib/learning";
import { DogImage } from "./DogImage";

export function BreedFacts({ breed }: { breed: Breed }) {
  const sources = new Map(breed.sources.map((s) => [s.id, s]));
  return (
    <>
      <p className="breed-meta">
        <span className="chip">{GROUP_LABELS[breed.group]} group</span>
        <span className="chip">Size: {breed.size}</span>
        <span className="chip">From: {breed.origin}</span>
      </p>
      <p>{breed.summary}</p>
      <ul className="traits">
        {breed.traits.map((t) => {
          const s = sources.get(t.source);
          return (
            <li key={t.text}>
              {t.text}{" "}
              {s && (
                <a className="cite" href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                  [source]
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function BreedCard({ breed, showImages = true }: { breed: Breed; showImages?: boolean }) {
  return (
    <article className="card breed-card" id={`breed-${breed.slug}`}>
      <h3>{breed.name}</h3>
      <BreedFacts breed={breed} />
      {showImages && (
        <div className="gallery">
          {breed.images.map((img, i) => (
            <DogImage key={img.url} src={img.url} alt={`${breed.name}, example photo ${i + 1}`} />
          ))}
        </div>
      )}
    </article>
  );
}
