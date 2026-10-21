/**
 * Validates every file under content/.
 *
 *   npm run validate            # schema, integrity and network checks
 *   npm run validate:offline    # skip the Dog CEO and source URL checks
 *
 * Exits non-zero if any problem is found. Warnings (such as unreviewed images)
 * are reported but do not fail the run.
 */
import { checkIntegrity } from "../src/content/parse";
import { readAllContent } from "./lib/content";

const offline = process.argv.includes("--offline");

const { curriculum, breeds, lessons, errors } = readAllContent();
const problems = [...errors];
const warnings: string[] = [];

if (curriculum) problems.push(...checkIntegrity(curriculum, breeds, lessons));

const unreviewedImages = breeds.flatMap((b) => b.images.filter((i) => !i.reviewed)).length;
const unreviewedBreeds = breeds.filter((b) => !b.reviewedBy).length;
const unreviewedLessons = lessons.filter((l) => !l.reviewedBy).length;
if (unreviewedImages) warnings.push(`${unreviewedImages} pinned image(s) not yet marked reviewed`);
if (unreviewedBreeds) warnings.push(`${unreviewedBreeds} breed file(s) without reviewedBy`);
if (unreviewedLessons) warnings.push(`${unreviewedLessons} lesson(s) without reviewedBy`);

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: limit }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
    }),
  );
}

async function headOk(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.status;
  } catch {
    return 0;
  }
}

if (!offline) {
  console.log("Checking Dog CEO breed list...");
  const list = (await (await fetch("https://dog.ceo/api/breeds/list/all")).json()) as {
    message: Record<string, string[]>;
  };
  for (const breed of breeds) {
    const [main, sub] = breed.dogCeoPath.split("/");
    const exists = sub ? list.message[main]?.includes(sub) : main in list.message;
    if (!exists)
      problems.push(`breed '${breed.slug}': Dog CEO has no breed '${breed.dogCeoPath}'`);
  }

  const imageUrls = new Set<string>([
    ...breeds.flatMap((b) => b.images.map((i) => i.url)),
    ...lessons.flatMap((l) => l.images.map((i) => i.url)),
    ...lessons.flatMap((l) => l.quiz.flatMap((q) => (q.type === "identify" && q.image ? [q.image] : []))),
  ]);
  console.log(`Checking ${imageUrls.size} pinned image URLs...`);
  await mapLimit([...imageUrls], 8, async (url) => {
    const status = await headOk(url);
    if (status !== 200) problems.push(`image ${url} returned HTTP ${status || "network error"}`);
  });

  const sourceUrls = new Set<string>([
    ...breeds.flatMap((b) => b.sources.map((s) => s.url)),
    ...lessons.flatMap((l) => l.sources.map((s) => s.url)),
  ]);
  console.log(`Checking ${sourceUrls.size} source URLs...`);
  await mapLimit([...sourceUrls], 4, async (url) => {
    const status = await headOk(url);
    // Some publishers block automated requests, so only clear "not found" responses fail.
    if (status === 404 || status === 410) problems.push(`source ${url} returned HTTP ${status}`);
    else if (status !== 200) warnings.push(`source ${url} returned HTTP ${status || "network error"}; check by hand`);
  });
}

console.log(
  `\nChecked ${breeds.length} breeds, ${lessons.length} lessons, ${curriculum?.units.length ?? 0} units${offline ? " (offline)" : ""}.`,
);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const p of problems) console.log(`ERROR ${p}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log("Content is valid.");
