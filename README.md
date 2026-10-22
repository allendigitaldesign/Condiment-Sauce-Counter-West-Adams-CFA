# Sauce & Condiment Counter — Chick-fil-A West Adams

A tap counter for everything handed out over the counter and through the
window: dipping sauces, dressings, condiments, coffee condiments and utensils.
**One tap on an item = one handed out.** Every count goes straight into a
**Google Sheet**. There's no database.

**Every device using the app counts into the same tallies.** That's the two
store iPads, or any other iPad or phone you open it on. They all show the
same numbers, and a tap on one shows up on all the others within a few
seconds. No device is labelled or set up differently. Counts start again at
zero each day.

It's styled like the Care Calendar (same red, same cream, same cards), and
like the Care Calendar it's a website you add to the iPad's home screen so it
opens like a normal app.

---

## What it counts

| Section | Items |
| --- | --- |
| Sauces | CFA Sauce, Ranch, BBQ, Polynesian, Sriracha, Honey Mustard, Honey Roasted BBQ |
| Dressings | Avocado Lime Ranch, Garden & Herb Ranch, FF Honey Mustard, Light Balsamic, Light Italian, Zesty Apple Cider, Creamy Salsa |
| Condiments | Ketchup, Mayo, Mustard, Grape Jelly, Strawberry Jelly, Honey, Texas Pete, Salsa, Salt, Pepper |
| Coffee Condiments | Half & Half, French Vanilla, Sugar, Splenda |
| Utensils | Forks, Knives, Spoons |

## Using it

- **Tap an item** to add one. The tile flashes and clicks so you know it counted.
- **Tapped by mistake?** Press the small **−** in the tile's bottom corner. It
  only appears once an item has a count, and it never goes below zero.
- The number in each section's corner is that section's total. The number in
  the red bar at the top is everything handed out today.
- **Live / Saving… / Offline** at the top right shows how it's talking to the
  Sheet. If the wifi drops it says **Offline · 6 waiting**. Keep tapping: the
  taps are saved on the iPad, and they're added to the Sheet as soon as the
  wifi comes back, even if the iPad was restarted in between.

## What ends up in the Google Sheet

Two tabs, which the script makes by itself:

- **Daily Counts**: one row per day, one column per item, and a Total. Today's
  row appears with the first tap of the day.
- **Tap Log**: every change as it came in, with the time, the item, and how
  many (a −1 shows up as a correction).

You can add your own tabs, charts or formulas to the Sheet. Don't rename the
two tabs or the item headings in row 1, because that's how the script finds
them.

---

## Setting it up

The Sheet part has to be done by you, because it means signing in to Google.
It takes about ten minutes, once.

### Step 1: Make the Sheet and its script

1. Go to <https://sheets.google.com> and make a **new blank spreadsheet**.
   Name it something like `CFA West Adams — Sauce Counts`.
2. In the menu click **Extensions → Apps Script**. A code editor opens in a
   new tab.
3. **Clear the editor completely.** Select everything in it, including the
   sample `function myFunction() { }`, and delete it, so the editor is empty.
4. **Copy the whole script in one go.** Open `apps-script/Code.gs` on GitHub
   and press the **Copy raw file** button (the two-overlapping-squares icon
   in the bar just above the code). That copies every line, which
   drag-selecting a long file, especially on an iPad, often doesn't. Paste it
   into the empty editor.
5. **Check both ends.** Line 1 must say
   `// ===== START OF Code.gs (Sauce Counter) =====`. Scroll to the very
   bottom: the last line must say
   `// ===== END OF Code.gs — if you can see this, everything was pasted =====`.
   If either is missing, go back to step 3. Then press the 💾 **Save** icon.
6. At the top, in the dropdown next to **Run**, choose **`setup`**, then
   press **Run**.
   Google will ask for permission: **Review permissions →** pick your
   account **→ Advanced → Go to (project name) → Allow**. That warning
   appears because you wrote the script yourself and Google hasn't reviewed
   it. It only ever touches this one spreadsheet.
7. Go back to the spreadsheet tab. You'll now see **Daily Counts** and **Tap
   Log**.

**If `setup` shows an error:**

- *"Only part of Code.gs was pasted"*, or anything ending **"is not
  defined"** (like `TIME_ZONE is not defined`): the top of the file didn't
  make it into the editor. Go back to step 3, empty the editor, and paste
  the whole file again.
- *"Syntax error"* when you press Save: the paste was cut off partway
  through. Same fix: empty the editor and paste the whole file again.

### Step 2: Turn the script into a web address

1. Back in the Apps Script tab, click **Deploy → New deployment**.
2. Click the ⚙️ next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
4. Press **Deploy**, then copy the **Web app URL**. It ends in `/exec`.

Give that URL to Claude, or put it in yourself: copy `.env.example`, name the
copy `.env`, and paste the URL after `VITE_SHEET_URL=`.

> "Anyone" is needed because the iPads don't sign in to Google. The address
> can only add to or read today's counts. It can't read the rest of your
> Google Drive, and the Sheet itself stays private to you. Anyone who dug the
> address out of the website could add counts, but every change is in the Tap
> Log with a time, so anything odd would stand out.

**If you ever change `Code.gs`:** paste the new version in, save, then
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
That keeps the same address. Making a *new* deployment instead gives a new
address, and the iPads would keep using the old one.

### Step 3: Put it on the web

The site is hosted free on **GitHub Pages**, from this repository. The repo is
public, which is what makes Pages free; there's nothing private in it.
Pushing to `main` publishes the site automatically, at:

**https://allendigitaldesign.github.io/Condiment-Sauce-Counter-West-Adams-CFA/**

It needs two things set once, both in this repo's **Settings**:

1. **Pages → Build and deployment → Source: GitHub Actions.**
2. **Secrets and variables → Actions → New repository secret**, named
   `VITE_SHEET_URL`, with the `/exec` web app address from Step 2 as the value.

The publish deliberately **fails** if `VITE_SHEET_URL` is missing, instead of
putting up a demo version that would look right on the iPads while saving
nothing to the Sheet. If that happens, add the secret, then open the
**Actions** tab → **Deploy to GitHub Pages** → **Run workflow** to try again.

Counts are not part of this. They live in the Sheet, so publishing never
touches them. Only changes to the app itself need publishing.

### Step 4: Set up the iPads

`docs/sauce-counter-qr.html` is a printable card with a QR code for the app.
Scan it with an iPad's Camera instead of typing the address. The bare code is
`docs/sauce-counter-qr.png`.

On each iPad (or any other device that should count):

1. Open **https://allendigitaldesign.github.io/Condiment-Sauce-Counter-West-Adams-CFA/**
   in **Safari**, then **Share → Add to Home Screen**.
2. Open it from the home screen. That's it. There's nothing to choose, and it
   starts counting into the shared tallies straight away.
3. **Settings → Display & Brightness → Auto-Lock → Never** if it sits on a
   stand. Landscape works best, since all 31 items fit on one screen.

---

## Trying it on a computer

In a terminal, in this folder:

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. With no `.env` it runs in **demo mode**: a
dark banner along the bottom, and counts kept only in that browser.

To try it against a pretend Sheet (the real `Code.gs`, run on your computer,
with nothing sent to Google), use two terminals:

```bash
npm run mock-sheet
VITE_SHEET_URL=http://localhost:8787 npm run dev
```

Open the page in two browser windows to see them stay in step.
<http://localhost:8787/sheet> shows what the pretend Sheet holds.

`npm test` runs the Sheet script against a pretend spreadsheet and checks the
item list in the app matches the one in the script.

---

## Changing the items

The list lives in **two** places, and they have to match:

- `src/items.ts`: what the iPads show
- `CATEGORIES` at the top of `apps-script/Code.gs`: what the Sheet records

Change both, run `npm test` (it fails if they disagree), push to publish the
app, and paste the new `Code.gs` into the Apps Script editor as a **new
version** (see Step 2). A new item gets its own new column on the end of
**Daily Counts** automatically. Nothing in the Sheet needs touching.

## How it's put together

| File | What it does |
| --- | --- |
| `apps-script/Code.gs` | The Sheet side: reads and adds to the day's counts, writes the Tap Log |
| `src/items.ts` | The 31 items and the sections they sit in |
| `src/store.ts` | Holds taps, sends them in batches, asks the Sheet for the other iPad's taps |
| `src/backend.ts` | Talks to the Sheet, or to the browser in demo mode |
| `src/screens/CounterScreen.tsx` | The counter itself |
| `src/components/ItemTile.tsx` | One item's tile, with its − button |
| `src/styles.css` | All the styling, using the Care Calendar's colours |
| `scripts/mock-sheet.mjs` | A pretend Sheet for trying it out locally |
| `scripts/apps-script.test.mjs` | The tests for `Code.gs` |
