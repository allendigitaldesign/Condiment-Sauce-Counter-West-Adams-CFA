# Working on this project

## Stack

Plain **Vite + React + TypeScript**, deployed as a website that is added to an
iPad home screen. Same stack and look as the Care Calendar
(`allendigitaldesign/cfa-care-calendar`, now in `cfa-05454/store-ops`), but a
separate project: different repo, no shared code, no shared data.

Data lives in a **Google Sheet**, on purpose. There is no database. The
Sheet's bound Apps Script (`apps-script/Code.gs`) is deployed as a web app
and is the only backend. Hosted on **Cloudflare Pages** (project
`cfa-condiment-counter`), deployed by `.github/workflows/deploy.yml` on push
to `main`. **Not Vercel**: its free plan forbids commercial use.

## The iPads are the screens

Usually two store iPads in landscape, but **any number of devices** can run
it, and **they are deliberately not told apart**: no station, no device
name, nothing in the Tap Log saying where a tap came from. Every device adds
into the same daily tallies. The owner asked for exactly that, so don't
reintroduce per-device labels without asking. At `≥900px` the
sections sit in two columns (`LANDSCAPE_COLUMNS` in `src/items.ts`) and fill
the screen exactly. **All 31 items must fit at 1133×744 (iPad mini landscape)
with no scrolling.** If you add an item or anything to the header, check that
it still does. Below 900px it becomes a scrolling page (4 tiles across on
portrait, 2 on a phone).

## Things that will bite you

- **The item list is written twice**: `src/items.ts` and `CATEGORIES` in
  `apps-script/Code.gs`. Ids must match exactly, or taps on the mismatched
  item are silently dropped by the script. `npm test` compares them, and CI
  runs it.
- **The Sheet finds columns by the header label**, not by position. Renaming
  a label starts a new column, and the old one stops updating. Missing labels
  get appended automatically.
- **`Code.gs` gets pasted by hand, and a partial paste is the likeliest
  failure.** It once came back as `ReferenceError: TIME_ZONE is not defined`
  because the top of the file never reached the editor. So the file opens
  with a `START OF Code.gs` marker and its settings, ends with an `END OF
  Code.gs` marker, and `checkWholeFilePasted_()` (kept at the very bottom, so
  any paste that includes `setup` includes it) turns a missing top into a
  plain instruction. Keep the markers as the first and last lines, keep
  settings at the top, and keep top-level code `typeof`-guarded. `npm test`
  tries a paste starting at every line.
- **Changing `Code.gs` does nothing until it is redeployed** as a new
  *version* of the *same* deployment (Manage deployments → Edit). A new
  deployment gets a new URL, and the iPads keep calling the old one. The
  script is pasted into the Apps Script editor by hand. Nothing here pushes
  it.
- **Requests are `text/plain`, never `application/json`.** JSON triggers a
  CORS preflight, and Apps Script cannot answer OPTIONS, so the POST would
  never be sent. Apps Script also replies with a 302 to
  `script.googleusercontent.com`, which `fetch` follows. A reply that isn't
  JSON almost always means the web app isn't shared with "Anyone" (Google
  sends a sign-in page instead).
- **Never double count.** Each batch carries an `opId`, and the script
  remembers ids for 6 hours (CacheService's limit) and ignores repeats. The
  client keeps the in-flight batch, opId included, in `localStorage` and
  resends it unchanged after a failure or reload. Don't give a resend a new id.
- **The screen shows server + in-flight + pending.** A poll answer is
  dropped if a send started or finished while it was out (`epoch` in
  `src/store.ts`). Otherwise it can briefly count this iPad's taps twice or
  not at all. Polls are skipped while a send is in flight.
- **Writes happen inside `LockService.getScriptLock()`.** Two devices tapping
  together would otherwise both read 12 and both write 13.
- **Never use `Date.toISOString()` for a day.** Days are
  `America/Los_Angeles` `"YYYY-MM-DD"` strings (`src/dates.ts`, `today()` in
  the script). A batch carries the day it was tapped on, so last night's
  offline taps land on last night's row. Dates in the Sheet are stored as
  **text** (`setNumberFormat('@')`). If Sheets turned them into dates they
  would display as `10/21/2026` and never match again.
- **Counts never go below zero**, in the client (the − is refused) and in the
  script (clamped). The Tap Log records only what actually changed.
- **Polling is every 3 s, only while the page is visible.** Reads go through
  a 20 s CacheService copy that every write refreshes, so the Sheet itself is
  read rarely. Watch the Apps Script quotas if you make it faster.
- **A refused batch is dropped, not retried.** A network failure or a non-200
  is retried with backoff. An `ok:false` reply is the script rejecting the
  batch, and retrying it would block every tap queued behind it.
- **Demo mode** (`demoBackend` in `src/backend.ts`) runs when
  `VITE_SHEET_URL` is unset. The deploy workflow refuses to build without it,
  so demo mode can't reach the store by accident.
- **The service worker is network-first** (`public/sw.js`, copied from the
  Care Calendar along with its two white-screen fixes). Keep it that way. It
  never touches the Sheet's requests, which are cross-origin.
- **A render that throws reloads once** (`src/components/ErrorBoundary.tsx`,
  from the Care Calendar), so a counter iPad never sits on a white page.
- **Icons are drawn from `design/app-icon.svg`** by
  `node scripts/render-icon.mjs` (Playwright's Chromium). iOS caches
  home-screen icons until the app is removed and re-added.

## Testing

- `npm test`: runs the real `Code.gs` against an in-memory spreadsheet
  (`scripts/gas-fakes.mjs`): batching, duplicates, the day boundary, never
  below zero, new columns, and the item-list match.
- `npm run mock-sheet` + `VITE_SHEET_URL=http://localhost:8787 npm run dev`:
  the full app against that same script over HTTP. `MOCK_DELAY=800` imitates
  Apps Script's real response time. Open two windows to watch them sync.

## Brand

Chick-fil-A red `#E51636`. Text in `#E51636` / `#B3123B` / `#C9758A` on cream
`#FAF7F2`, borders `#E7DFD3`, as in the Care Calendar. Offline uses the Care
Calendar's amber nudge colours. The demo banner is charcoal so it never reads
as the store's own UI.

## Audience

The owner is not a professional developer. Explain in plain language, say
where a command goes ("in a terminal"), and run local commands yourself where
you can. Anything that needs their Google or Cloudflare sign-in has to be
called out as theirs to do.
