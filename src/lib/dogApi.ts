import type { Breed } from "../content/schema";
import { imageFolderFor } from "../content/parse";
import { pickRandom, type Rng } from "./random";

const API = "https://dog.ceo/api";

const imageLists = new Map<string, Promise<string[]>>();

/**
 * All photos Dog CEO has for a breed, fetched once per session. Falls back to the
 * breed's pinned (audited) photos if the API is unreachable.
 */
export function imagesFor(breed: Breed, fetcher: typeof fetch = fetch): Promise<string[]> {
  let list = imageLists.get(breed.slug);
  if (!list) {
    const pinned = breed.images.map((i) => i.url);
    const folder = imageFolderFor(breed.dogCeoPath);
    list = fetcher(`${API}/breed/${breed.dogCeoPath}/images`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: { status: string; message: string[] }) => {
        const urls = json.status === "success" ? json.message.filter((u) => u.startsWith(folder)) : [];
        return urls.length ? urls : pinned;
      })
      .catch(() => {
        imageLists.delete(breed.slug);
        return pinned;
      });
    imageLists.set(breed.slug, list);
  }
  return list;
}

/** A random live photo of the breed, avoiding any URLs in `exclude` when possible. */
export async function randomLiveImage(breed: Breed, exclude: Set<string> = new Set(), rng?: Rng): Promise<string> {
  const urls = await imagesFor(breed);
  const fresh = urls.filter((u) => !exclude.has(u));
  return pickRandom(fresh.length ? fresh : urls, rng);
}

/** A random pinned (audited) photo of the breed. */
export function randomPinnedImage(breed: Breed, exclude: Set<string> = new Set(), rng?: Rng): string {
  const urls = breed.images.map((i) => i.url);
  const fresh = urls.filter((u) => !exclude.has(u));
  return pickRandom(fresh.length ? fresh : urls, rng);
}

export function clearImageCache() {
  imageLists.clear();
}
