import type { Breed } from "../content/schema";
import { DogImage } from "./DogImage";

export function CompareBreeds({ a, b }: { a: Breed; b: Breed }) {
  return (
    <div className="card compare">
      <h3>
        Spot the difference: {a.name} vs {b.name}
      </h3>
      <div className="compare-grid">
        {[a, b].map((breed) => (
          <div key={breed.slug} className="compare-col">
            <h4>{breed.name}</h4>
            <DogImage src={breed.images[0].url} alt={breed.name} />
            <ul className="traits">
              {breed.traits.map((t) => (
                <li key={t.text}>{t.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
