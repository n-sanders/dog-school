# DogSchool

A web app for learning to identify dog breeds. Learners work through progressive
lessons with real, breed-tagged photos, then practice and review until they can
recognize every breed in the course.

- No accounts. Progress is stored only in the learner's browser (`localStorage`).
- Learners can mark any lesson completed (or not completed) by hand, and can
  download and restore a progress backup from the **Progress** page.

## Running it

```sh
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ (works from any folder or host)
npm test             # unit tests
npm run validate     # check all content (needs network for image/source checks)
npm run validate:offline
npm run audit        # regenerate docs/audit/content-report.md
```

## Where the photos come from

Photos come from the [Dog CEO API](https://dog.ceo/dog-api/). Most of them come
from the [Stanford Dogs Dataset](http://vision.stanford.edu/aditya86/ImageNetDogs/),
a research dataset where each breed label was checked by a person.

- **Lessons and lesson quizzes** only use photos that are **pinned** (listed by URL)
  in the breed files, so every photo a learner is tested on can be reviewed first.
- **Practice and Review** use random live photos from Dog CEO for variety. Only
  photos from that breed's own Dog CEO folder are used. If the API cannot be
  reached, the pinned photos are used instead.

## Content layout (for auditors)

All course content is plain text under `content/`. The app has no content of its
own; it only displays these files.

```
content/
  curriculum.yaml               units and lesson order
  breeds/<slug>.yaml            one file per breed: traits, look-alikes, sources, pinned photos
  lessons/<unit>-<nn>-<slug>.md one file per lesson: YAML frontmatter + Markdown text
docs/audit/content-report.md    generated report covering everything above
```

- Every **breed trait** cites a source (an AKC breed page) by `source` id.
- Every **lesson** lists its objectives, prerequisites, breeds, comparisons and
  quiz items in its frontmatter. Quiz answers can be read directly from the file.
- Every breed file, lesson file and pinned photo has review fields (`reviewedBy`,
  `reviewedOn`, `reviewed`) for recording sign-off.

The schemas are defined in `src/content/schema.ts`. `npm run validate` checks:

- every file matches its schema;
- IDs are unique, and every lesson is listed in the curriculum and belongs to the
  unit that lists it;
- prerequisites exist, come earlier in the curriculum and have no cycles;
- every breed referenced in lessons, comparisons, quizzes and look-alikes exists;
- every trait cites a source that exists in its breed file;
- every pinned photo is inside the correct breed's Dog CEO folder and loads (HTTP 200);
- every breed's `dogCeoPath` exists in the Dog CEO breed list;
- source URLs respond.

### Audit workflow

1. Run `npm run audit` and open `docs/audit/content-report.md`.
2. Check each lesson's text and quiz answers, each breed's traits against the
   cited source, and each pinned photo.
3. To reject a photo, delete it from the breed file and run
   `npm run pin-images -- <breed-slug>` to pin a replacement candidate. Mark
   good photos `reviewed: true`.
4. Fill in `reviewedBy` / `reviewedOn`, then run `npm run validate` and
   `npm run audit` again and commit the changes. Git history then shows who
   changed what and when.

### Adding a lesson or breed

1. Breed: create `content/breeds/<slug>.yaml` (copy an existing one) with
   `images: []`, then run `npm run pin-images -- <slug>`.
2. Lesson: create `content/lessons/<unit>-<nn>-<slug>.md` and add its id to
   `content/curriculum.yaml`.
3. Run `npm run validate`.

## Code layout

```
src/content/   schemas, parser, integrity checks and the build-time loader
src/lib/       Dog CEO client, quiz generation, progress store
src/pages/     Home, Learn, Lesson, Practice, Review, Breeds, Progress
src/components shared UI pieces
scripts/       validate, audit and pin-images tools
tests/         Vitest tests
```
