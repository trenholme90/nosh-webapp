# Nosh

Meal planning that fits a tight budget — pick recipes, plan the week, and get one
shopping list with everything added up.

Built for the Enablis engineering challenge against the brief in
[`docs/client-brief.pdf`](docs/client-brief.pdf).

> **Status: the four baseline features.** You can browse the starter recipes, add,
> edit and delete your own, set dietary preferences so only suitable recipes show,
> plan breakfast, lunch and dinner across the week, and get one shopping list for
> that week with everything added up and ready to tick off.

## Requirements

- **Node.js 24 or newer.** The API uses Node's built-in `node:sqlite` module. It
  landed in 22.5 behind `--experimental-sqlite` and only became usable without that
  flag from 23.4, so Node 24 (the current LTS) is the minimum.
- npm (ships with Node).

Check with:

```bash
node --version    # v24.x or newer
```

## Quick start

```bash
npm install     # installs every workspace and links them together
npm run dev     # API on :4000, web client on :5173
```

Then open <http://localhost:5173>. The page shows a connection indicator; when the
API is up it reports how many starter recipes are loaded.

## Scripts

Run these from the repo root.

| Script                 | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Runs the API and the web client together        |
| `npm run dev:api`      | API only, on <http://localhost:4000>            |
| `npm run dev:web`      | Web client only, on <http://localhost:5173>     |
| `npm test`             | Runs the Vitest suites in both apps and exits   |
| `npm run test:e2e`     | Runs the Playwright end-to-end suite            |
| `npm run typecheck`    | Type-checks every workspace                     |
| `npm run lint`         | ESLint across the repo                          |
| `npm run build`        | Production build of the web client              |
| `npm run format`       | Formats with Prettier                           |
| `npm run format:check` | Fails if anything is unformatted (CI runs this) |

## Configuration

Nothing needs configuring to run locally — the defaults _are_ the development
setup. These environment variables are read if you set them:

| Variable            | Read by    | Default                 | What it does                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`              | `apps/api` | `4000`                  | Port the API listens on. Read straight from the process environment; there is no dotenv loader, so export it or prefix the command: `PORT=4100 npm run dev:api`.                                                                                                                                                                                                                               |
| `VITE_API_BASE_URL` | `apps/web` | `/api`                  | Base URL the client prefixes onto API requests. Leave it unset in development — the client calls same-origin `/api/*` and Vite proxies them. Set it only when the API is served from another origin, and note the API has no CORS configuration yet, so that setup needs CORS added first. Vite reads it from `apps/web/.env`; copy [`apps/web/.env.example`](apps/web/.env.example) to start. |
| `NOSH_DB_PATH`      | `apps/api` | `apps/api/data/nosh.db` | SQLite file the API opens. The E2E suite sets it to `:memory:` so every run starts from the starter recipes.                                                                                                                                                                                                                                                                                   |
| `NOSH_API_URL`      | `apps/web` | `http://localhost:4000` | Where the Vite dev server proxies `/api/*`. The E2E suite points it at its own API.                                                                                                                                                                                                                                                                                                            |

## How it is put together

```
apps/web  ──fetch /api/*──▶  Vite dev proxy  ──▶  apps/api  ──▶  SQLite
 :5173                                              :4000        nosh.db
```

**Two processes, not one.** The brief asks for a client UI with a separate API layer
behind it, so the API is a standalone Express service rather than routes folded into
the front end. The boundary is a process and an HTTP contract, which means the client
could be replaced without touching the API, and vice versa.

**No CORS configuration.** In development the client calls same-origin `/api/*` paths
and Vite proxies them to the API, so the browser never makes a cross-origin request.

**Fonts are self-hosted.** Nunito and Nunito Sans are served from `/fonts` as
latin-subset variable woff2 rather than from a font CDN. A third-party stylesheet
holds up first paint behind a DNS lookup and TLS handshake to another origin
before the font request even starts, which is the wrong trade on the older phones
the brief targets.

**SQLite via `node:sqlite`.** Real SQL and real persistence with zero dependencies and
no native compilation step — it is part of Node itself. `apps/api/data/nosh.db` is
generated on first boot and is not committed; delete it and it rebuilds and reseeds.

**A seam for testing.** `createApp(db)` takes its database rather than importing a
singleton, and `createDatabase(path)` takes a path. Tests therefore run against
`:memory:` through exactly the same code path production uses, without binding a port
or touching a file.

**The API is not compiled.** It runs under `tsx` in both dev and `npm start`. For a
locally run demo a build step would add moving parts without adding value, so the
`build` script belongs to the web client only; `npm run typecheck` covers the API.

### Layout

```
apps/
  api/                 Express + TypeScript REST API
    data/              starter recipes JSON, and the generated SQLite file
    src/
      app.ts           app factory — mounts routes, no listen()
      index.ts         process entrypoint — port, listen, shutdown
      db/              schema.sql, paths, connection, seeding, recipe, plan and tick reads and writes
      routes/          health, recipes, preferences, plan, shopping-list
      shopping/        builds the shopping list from the plan: scaling, adding up, rounding
      __tests__/
  web/                 Vite + React + TypeScript client
    src/
      pages/           one component per route
      components/      pieces shared between pages
      lib/             typed fetch wrapper, endpoints, diet filter, formatting, hooks
      styles/          brand tokens and global styles
packages/
  shared/              domain types, recipe validation and the API contract (@nosh/shared)
e2e/                   Playwright end-to-end suite, with axe accessibility checks
```

## Accessibility

The brief sets WCAG AA and calls out older, smaller phones. Measured contrast ratios
for the brand palette are recorded at the top of
[`apps/web/src/styles/tokens.css`](apps/web/src/styles/tokens.css). The headline
result worth knowing: **Nosh Green is a background colour, not a text colour** — it
measures 1.98:1 on white and fails AA, but 6.13:1 against Nosh Charcoal. Text sitting
on a green button must therefore be charcoal, not white.

## Brand assets

`apps/web/public/brand/` holds the logo assets, traced to SVG from the raster
artwork embedded in the client brief:

| File                | What it is                                                       |
| ------------------- | ---------------------------------------------------------------- |
| `nosh-wordmark.svg` | The NOSH lettering on its own, for pairing with the mark         |
| `nosh-mark.svg`     | The icon alone - fork and knife curving into a bowl, flame, leaf |

The header pairs the mark with the wordmark, and the mark doubles as the
favicon. Both load as separate files rather than being inlined, so they stay
cacheable and out of the JS bundle - which matters given the audience is on older
phones.

Both use the exact brand palette. The artwork was traced per colour region, so
each fill is a separate path: Deep Teal for the cutlery and bowl, Flame Coral for
the flame and Leaf for the leaf in the mark, and Nosh Green for the wordmark.
The brief's full lockup also carries a "MEAL PLANNING PLATFORM" strapline in
Cloud Grey; neither asset here includes it, so nothing in the repo uses that
colour yet.

**On "never recolour".** The brief forbids recolouring, and these assets carry the
palette values rather than the colours sampled from the supplied artwork, so it is
worth recording why that is not a recolour. The artwork embedded in the brief is a
JPEG, and its greens sample as a scatter of compression artefacts - `#60D19B`,
`#5FD09C`, `#5FD09A`, `#5ED19A` and so on - clustered 5-7 RGB from `--nosh-green`
`#62CC9B`. There is no single sampled colour to be faithful to, and choosing one
would freeze an arbitrary artefact into the asset. The palette on the brief's
visual identity page is the authority, and the SVGs reproduce it exactly.

The brief also specifies clear space around the mark of at least the width of the
"O" - about 24.4px at the size the header uses. The header keeps 32px on every
side: block padding on the bar, and the inline gutter in `--content-width`.

## Testing

Two layers, both run in CI:

- **Vitest** (`npm test`) for the API and the client's logic. API tests go through
  HTTP with supertest against an in-memory database. Client tests cover formatting
  and the failure states that are hard to set up in a real browser, such as a
  malformed response or an API that is down.
- **Playwright** (`npm run test:e2e`) for user journeys through the real client and
  API: browsing, adding, editing and deleting recipes, and validation. Every page
  and state is also scanned with axe for WCAG 2.2 AA violations. The suite starts
  its own API on an in-memory database and its own client, on ports 4100 and 5174,
  so it never touches your dev data or clashes with `npm run dev`.

  Run `npx playwright install chromium` once before the first run.
  `npm run e2e:ui --workspace=e2e` opens Playwright's UI mode for debugging.

The E2E tests run in parallel against one API, so each one creates its own
uniquely named recipes and deletes them afterwards. New tests must not assume the
list of custom recipes is empty. Find elements by role and label, the way a
screen-reader user would, rather than by CSS class. Accessibility checks sit inside
the journey tests, not in a separate spec: when a test reaches a new page or state,
it calls `expectNoA11yViolations(page)` there, so each feature's spec covers its own
accessibility.

Dietary preferences are one global setting, so a test that changes them would change
what every other test sees. Those tests live in `preferences.spec.ts`, which runs in
its own Playwright project after the rest of the suite, one test at a time, and
resets the preferences around each test. The weekly plan is global in the same way,
so `plan.spec.ts` gets a project of its own that runs after that one and clears the
week around each test. The shopping list is worked out from that week, so
`shopping-list.spec.ts` runs in one more project after it. Any future test that changes
global state belongs in a project like that too.

## Data

The client supplied 20 starter recipes in
`apps/api/data/project-nosh-sample-recipes.json`. They are loaded into SQLite on first
boot. Ingredient names are lowercased and mostly consistent (`butter` appears in 7,
`onion` in 7), so the shopping list groups on the name. A few differ only by plural
(`carrot`/`carrots`, `apple`/`apples`), so a plural shares its singular's line when
both are on the list; a name on its own is never re-spelt. Units are not consistent: `milk`
appears in ml and tbsp, `coconut milk` in tins and ml, `salad leaves` in handfuls and g.
The list (`apps/api/src/shopping/build-list.ts`) therefore adds up only what converts
safely - g with kg, and ml with l, tbsp and tsp - and shows anything else side by side
("1 tin + 200 ml") rather than guessing how big a tin is. It scales each recipe to the
servings planned, adds up, and only then rounds up to what you can buy: whole onions
and tins, half spoons, and weights and volumes to the next 5.
