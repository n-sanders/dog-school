/**
 * Pins candidate photos from the Dog CEO API into breed files.
 *
 *   npm run pin-images                 # top up every breed to 4 images
 *   npm run pin-images -- pug beagle   # only these breeds
 *   npm run pin-images -- --count 6
 *
 * New images are added with `reviewed: false`. A human reviewer should look at
 * each one (the audit report links them) and set `reviewed: true`, or delete it.
 * Stanford Dogs dataset images (filenames like n02085620_123.jpg) are preferred
 * because their breed labels come from a curated research dataset.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { parseDocument, YAMLSeq } from "yaml";
import { BREEDS_DIR, listFiles, rel } from "./lib/content";

const STANFORD = /\/n\d{8}_\d+\.jpe?g$/i;

const args = process.argv.slice(2);
const countFlag = args.indexOf("--count");
const target = countFlag >= 0 ? Number(args[countFlag + 1]) : 4;
const only = args.filter((a, i) => !a.startsWith("--") && (countFlag < 0 || i !== countFlag + 1));

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

for (const file of listFiles(BREEDS_DIR, ".yaml")) {
  const slug = basename(file, ".yaml");
  if (only.length && !only.includes(slug)) continue;

  const doc = parseDocument(readFileSync(file, "utf8"));
  const path = String(doc.get("dogCeoPath"));
  let images = doc.get("images") as YAMLSeq | undefined;
  if (!(images instanceof YAMLSeq)) {
    images = new YAMLSeq();
    doc.set("images", images);
  }
  const existing = new Set(images.items.map((i) => String((i as { get(k: string): unknown }).get("url"))));
  const needed = target - existing.size;
  if (needed <= 0) continue;

  const res = await fetch(`https://dog.ceo/api/breed/${path}/images`);
  const json = (await res.json()) as { status: string; message: string[] };
  if (json.status !== "success") {
    console.error(`${slug}: Dog CEO returned ${json.status}`);
    process.exitCode = 1;
    continue;
  }
  const candidates = json.message.filter((u) => !existing.has(u));
  const preferred = shuffle(candidates.filter((u) => STANFORD.test(u)));
  const others = shuffle(candidates.filter((u) => !STANFORD.test(u)));
  const picks = [...preferred, ...others].slice(0, needed);

  for (const url of picks) images.add(doc.createNode({ url, note: "", reviewed: false }));
  images.flow = false;
  writeFileSync(file, doc.toString({ lineWidth: 0 }));
  console.log(`${rel(file)}: pinned ${picks.length} image(s) from ${json.message.length} available`);
}
