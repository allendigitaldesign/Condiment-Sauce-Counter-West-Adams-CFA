/**
 * Runs the real apps-script/Code.gs against a pretend spreadsheet.
 *
 *   npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadScript, get, post } from './gas-fakes.mjs';

// 10:30pm in Los Angeles on 21 Oct 2026 — already the 22nd in UTC, which is
// exactly the mistake the script must not make.
const LATE_CLOSE = Date.UTC(2026, 9, 22, 5, 30);

let n = 0;
const opId = () => `test-op-${String(++n).padStart(4, '0')}`;

function fresh() {
  const loaded = loadScript();
  loaded.clock.now = LATE_CLOSE;
  loaded.script.setup();
  return loaded;
}

test('setup builds both tabs with every item as a column, in order', () => {
  const { spreadsheet } = fresh();
  assert.deepEqual(
    spreadsheet.getSheets().map((s) => s.getName()),
    ['Daily Counts', 'Tap Log'],
  );
  const header = spreadsheet.getSheetByName('Daily Counts').cells[0];
  assert.equal(header[0], 'Date');
  assert.equal(header[1], 'CFA Sauce');
  assert.equal(header.at(-1), 'Total');
  assert.equal(header.length, 31 + 2);
});

test('running setup again changes nothing', () => {
  const { script, spreadsheet } = fresh();
  post(script, { opId: opId(), station: 'Drive Thru', deltas: { ranch: 2 } });
  const before = JSON.stringify(spreadsheet.sheets.map((s) => s.cells));
  script.setup();
  assert.equal(JSON.stringify(spreadsheet.sheets.map((s) => s.cells)), before);
});

test('the day is the Los Angeles day, not the UTC one', () => {
  const { script } = fresh();
  assert.equal(get(script).date, '2026-10-21');
});

test('taps add up, write a row and a Total, and are logged per station', () => {
  const { script, spreadsheet } = fresh();
  post(script, { opId: opId(), station: 'Front Counter', deltas: { 'cfa-sauce': 3, ketchup: 1 } });
  const reply = post(script, { opId: opId(), station: 'Drive Thru', deltas: { 'cfa-sauce': 2 } });

  assert.equal(reply.ok, true);
  assert.equal(reply.counts['cfa-sauce'], 5);
  assert.equal(reply.counts.ketchup, 1);
  assert.equal(reply.counts.ranch, 0);

  const counts = spreadsheet.getSheetByName('Daily Counts').cells;
  assert.equal(counts.length, 2);
  assert.equal(counts[1][0], '2026-10-21');
  assert.equal(counts[1][1], 5);
  assert.equal(counts[1].at(-1), 6);

  const log = spreadsheet.getSheetByName('Tap Log').cells.slice(1);
  assert.deepEqual(
    log.map((r) => r.slice(1)),
    [
      ['2026-10-21', 'Front Counter', 'Sauces', 'CFA Sauce', 3],
      ['2026-10-21', 'Front Counter', 'Condiments', 'Ketchup', 1],
      ['2026-10-21', 'Drive Thru', 'Sauces', 'CFA Sauce', 2],
    ],
  );
});

test('the same batch sent twice is only counted once', () => {
  const { script } = fresh();
  const id = opId();
  post(script, { opId: id, station: 'Front Counter', deltas: { mayo: 4 } });
  const again = post(script, { opId: id, station: 'Front Counter', deltas: { mayo: 4 } });
  assert.equal(again.duplicate, true);
  assert.equal(again.counts.mayo, 4);
});

test('a correction never takes a count below zero, and logs what really changed', () => {
  const { script, spreadsheet } = fresh();
  post(script, { opId: opId(), station: 'Front Counter', deltas: { honey: 1 } });
  const reply = post(script, { opId: opId(), station: 'Front Counter', deltas: { honey: -3, salt: -1 } });
  assert.equal(reply.counts.honey, 0);
  assert.equal(reply.counts.salt, 0);
  const log = spreadsheet.getSheetByName('Tap Log').cells.slice(1);
  assert.deepEqual(log.at(-1).slice(4), ['Honey', -1]);
  assert.equal(log.length, 2);
});

test('unknown items are ignored and silly numbers refused', () => {
  const { script } = fresh();
  const reply = post(script, { opId: opId(), station: 'Front Counter', deltas: { gravy: 5, ranch: 1 } });
  assert.equal(reply.counts.gravy, undefined);
  assert.equal(reply.counts.ranch, 1);
  const refused = post(script, { opId: opId(), station: 'Front Counter', deltas: { ranch: 100000 } });
  assert.equal(refused.ok, false);
  assert.equal(post(script, { station: 'Front Counter', deltas: { ranch: 1 } }).ok, false);
});

test('a new day starts from zero in a new row; late taps land on their own day', () => {
  const { script, spreadsheet, clock } = fresh();
  post(script, { opId: opId(), station: 'Front Counter', deltas: { sugar: 2 } });

  clock.now = LATE_CLOSE + 12 * 3600 * 1000; // next morning
  assert.equal(get(script).counts.sugar, 0);
  post(script, { opId: opId(), station: 'Front Counter', deltas: { sugar: 1 } });
  // An iPad that was offline at close sends last night's tap this morning.
  post(script, { opId: opId(), station: 'Drive Thru', date: '2026-10-21', deltas: { sugar: 1 } });

  assert.equal(get(script, { date: '2026-10-21' }).counts.sugar, 3);
  assert.equal(get(script).counts.sugar, 1);
  const rows = spreadsheet.getSheetByName('Daily Counts').cells.slice(1).map((r) => r[0]);
  assert.deepEqual(rows, ['2026-10-21', '2026-10-22']);
});

test('a date from the future is treated as today', () => {
  const { script } = fresh();
  const reply = post(script, { opId: opId(), station: 'Front Counter', date: '2027-01-01', deltas: { forks: 1 } });
  assert.equal(reply.date, '2026-10-21');
});

test('an item added to the list later gets its own new column', () => {
  const { script, spreadsheet } = fresh();
  const header = spreadsheet.getSheetByName('Daily Counts').cells[0];
  header.splice(header.indexOf('Spoons'), 1, ''); // pretend Spoons is new
  post(script, { opId: opId(), station: 'Front Counter', deltas: { spoons: 2 } });
  const after = spreadsheet.getSheetByName('Daily Counts').cells;
  assert.equal(after[0].at(-1), 'Spoons');
  assert.equal(after[1].at(-1), 2);
});

test('the item list in the app and in the script match exactly', () => {
  const { script } = loadScript();
  const fromScript = [];
  for (const category of script.CATEGORIES) {
    for (const [id, label] of category.items) fromScript.push(`${category.label}|${id}|${label}`);
  }

  // Read src/items.ts as text rather than importing it, so this needs no
  // TypeScript build.
  const source = readFileSync(new URL('../src/items.ts', import.meta.url), 'utf8');
  const fromApp = [];
  let category = null;
  for (const line of source.split('\n')) {
    const cat = line.match(/^\s+label: '(.+)',$/);
    if (cat) category = cat[1];
    const item = line.match(/\{ id: '([^']+)', label: '([^']+)' \}/);
    if (item) fromApp.push(`${category}|${item[1]}|${item[2]}`);
  }

  assert.deepEqual(fromApp, fromScript);
});
