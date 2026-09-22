# Nosh

Meal planning that fits a tight budget — pick recipes, plan the week, and get one
shopping list with everything added up.

Built for the Enablis engineering challenge against the brief in
[`docs/client-brief.pdf`](docs/client-brief.pdf).

> **Status: scaffolding.** The workspace, API, client, database and tooling are in
> place and wired together end to end. The product features — recipe browsing,
> dietary preferences, the weekly planner and the shopping list — are not built yet.

## Requirements

- **Node.js 24 or newer.** The API uses Node's built-in `node:sqlite` module. It
  landed in 22.5 behind `--experimental-sqlite` and only became usable without that
  flag from 23.4, so 24 is the floor rather than the current LTS line generally.
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
| `npm run typecheck`    | Type-checks every workspace                     |
| `npm run lint`         | ESLint across the repo                          |
| `npm run build`        | Production build of the web client              |
| `npm run format`       | Formats with Prettier                           |
| `npm run format:check` | Fails if anything is unformatted (CI runs this) |

## Configuration

Nothing needs configuring to run locally — the defaults _are_ the development
setup. Two environment variables are read if you set them:

| Variable            | Read by    | Default | What it does                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`              | `apps/api` | `4000`  | Port the API listens on. Read straight from the process environment; there is no dotenv loader, so export it or prefix the command: `PORT=4100 npm run dev:api`.                                                                                                                                         |
| `VITE_API_BASE_URL` | `apps/web` | `/api`  | Base URL the client prefixes onto API requests. Leave it unset in development — the client calls same-origin `/api/*` and Vite proxies them. Set it only when the API is served from another origin. Vite reads it from `apps/web/.env`; copy [`apps/web/.env.example`](apps/web/.env.example) to start. |

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
      db/              schema.sql, paths, connection, seeding, read queries
      routes/
      __tests__/
  web/                 Vite + React + TypeScript client
    src/
      lib/api.ts       typed fetch wrapper
      styles/          brand tokens and global styles
packages/
  shared/              domain types used by both apps (@nosh/shared)
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

| File                | What it is                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `nosh-logo.svg`     | Full lockup: NOSH plus the MEAL PLANNING PLATFORM strapline       |
| `nosh-wordmark.svg` | NOSH on its own, for small sizes where the strapline is illegible |
| `nosh-mark.svg`     | The icon alone - fork and knife curving into a bowl, flame, leaf  |

The header pairs the mark with the compact wordmark, and the mark doubles as the
favicon. The full lockup is not referenced by the app yet - it ships for the
footer and share card that arrive with the feature work. All three load as
separate files rather than being inlined, so they stay cacheable and out of the
JS bundle - which matters given the audience is on older phones.

All three are full colour, using the exact brand palette. The artwork was traced per
colour region, so each fill is a separate path: Deep Teal for the cutlery and
bowl, Flame Coral for the flame, Leaf for the leaf, Nosh Green for the wordmark
and Cloud Grey for the strapline. The brief says never to recolour the mark, so
the colours are fixed in the asset rather than inherited from CSS.

The brief also specifies clear space around the mark of at least the width of the
"O" - about 18px at the size the header uses. The header keeps 24px on every
side: block padding on the bar, and the inline gutter in `--content-width`.

## Testing

Vitest in both apps — `npm test` runs everything once and exits.

The current suites are deliberately thin: they prove the harness works and pin the
data-loading behaviour the rest of the app will depend on (all 20 starter recipes and
132 ingredient rows load, re-seeding does not duplicate, nullable quantities survive
the round trip). Feature tests arrive with the features.

## Data

The client supplied 20 starter recipes in
`apps/api/data/project-nosh-sample-recipes.json`. They are loaded into SQLite on first
boot. Worth noting for the shopping-list work: ingredient names are already consistent
and lowercased across recipes (`butter` appears in 7, `onion` in 7), so aggregation can
key on the name directly. Some ingredients have a null quantity or unit, which any
summing logic will need to handle.
