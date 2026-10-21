import { useState } from "react";
import { allBreeds } from "../content/loader";
import { BreedCard } from "../components/BreedCard";
import { AKC_GROUPS } from "../content/schema";
import { GROUP_LABELS } from "../lib/learning";

export function BreedsPage() {
  const [group, setGroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const breeds = allBreeds().filter(
    (b) => (group === "all" || b.group === group) && b.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div>
      <h1>Breed guide</h1>
      <p className="muted">Every breed in the course, with its identifying traits and sources.</p>
      <div className="card controls row">
        <label>
          Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Group{" "}
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {AKC_GROUPS.map((g) => (
              <option key={g} value={g}>
                {GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {breeds.length === 0 && <p>No breeds match.</p>}
      {breeds.map((b) => (
        <BreedCard key={b.slug} breed={b} />
      ))}
    </div>
  );
}
