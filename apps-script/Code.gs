// ===== START OF Code.gs (Sauce Counter) =====
// Paste ALL of this file into the Sheet's Apps Script editor: from this line
// down to the "END OF Code.gs" line at the very bottom. See README, Step 1.

var TIME_ZONE = 'America/Los_Angeles';
var COUNTS_SHEET = 'Daily Counts';
var LOG_SHEET = 'Tap Log';

/**
 * Everything the store counts. This list is written TWICE: here, and in
 * `src/items.ts` in the app. The ids must match exactly. If one changes,
 * change both, then run `npm test`, which compares them.
 *
 * The Sheet finds its columns by these labels, so renaming a label here
 * starts a fresh column for it rather than overwriting the old one.
 */
var CATEGORIES = [
  {
    label: 'Sauces',
    items: [
      ['cfa-sauce', 'CFA Sauce'],
      ['ranch', 'Ranch'],
      ['bbq', 'BBQ'],
      ['polynesian', 'Polynesian'],
      ['sriracha', 'Sriracha'],
      ['honey-mustard', 'Honey Mustard'],
      ['buffalo', 'Buffalo'],
      ['syrup', 'Syrup'],
    ],
  },
  {
    label: 'Dressings',
    items: [
      ['avocado-lime-ranch', 'Avocado Lime Ranch'],
      ['garden-herb-ranch', 'Garden & Herb Ranch'],
      ['ff-honey-mustard', 'FF Honey Mustard'],
      ['light-balsamic', 'Light Balsamic'],
      ['light-italian', 'Light Italian'],
      ['zesty-apple-cider', 'Zesty Apple Cider'],
      ['creamy-salsa', 'Creamy Salsa'],
    ],
  },
  {
    label: 'Condiments',
    items: [
      ['ketchup', 'Ketchup'],
      ['mayo', 'Mayo'],
      ['mustard', 'Mustard'],
      ['grape-jelly', 'Grape Jelly'],
      ['strawberry-jelly', 'Strawberry Jelly'],
      ['honey', 'Honey'],
      ['texas-pete', 'Texas Pete'],
      ['salsa', 'Salsa'],
      ['honey-roasted-bbq', 'Honey Roasted BBQ'],
      ['salt', 'Salt'],
      ['pepper', 'Pepper'],
    ],
  },
  {
    label: 'Coffee Condiments',
    items: [
      ['half-and-half', 'Half & Half'],
      ['french-vanilla', 'French Vanilla'],
      ['sugar', 'Sugar'],
      ['splenda', 'Splenda'],
    ],
  },
  {
    label: 'Utensils',
    items: [
      ['forks', 'Forks'],
      ['knives', 'Knives'],
      ['spoons', 'Spoons'],
    ],
  },
];

/** id → { label, category }, built once from the list above. */
var ITEMS =
  typeof CATEGORIES === 'undefined'
    ? {} // only part of the file was pasted — checkWholeFilePasted_ says so
    : (function () {
        var out = {};
        CATEGORIES.forEach(function (category) {
          category.items.forEach(function (pair) {
            out[pair[0]] = { label: pair[1], category: category.label };
          });
        });
        return out;
      })();

var ITEM_IDS = typeof ITEMS === 'undefined' ? [] : Object.keys(ITEMS);

/**
 * HOW IT WORKS
 *
 * Paste this whole file into the Sheet's Apps Script editor (Extensions →
 * Apps Script), run `setup` once, then deploy it as a web app. The README has
 * the clicks. Every device using the app talks to the web app address;
 * nothing else is needed.
 *
 * WHAT IT KEEPS
 *
 *   Daily Counts  one row per day, one column per item, plus a Total. The row
 *                 for a day appears the first time anyone taps that day.
 *   Tap Log       every change as it arrives — when, which item, how many —
 *                 so a correction can always be traced.
 *
 * Every device using the app — any number of iPads or phones — counts into
 * the same numbers. None of them is told apart.
 *
 * THREE THINGS IT IS CAREFUL ABOUT
 *
 *  1. Two devices tapping at the same moment. Every write happens inside the
 *     script lock, so one waits for the other instead of both reading "12",
 *     both adding one, and both writing "13".
 *  2. A tap sent twice. An iPad whose wifi drops mid-send cannot know whether
 *     the Sheet got it, so it sends again. Each batch carries an id, and an id
 *     seen in the last six hours is answered without being counted again.
 *  3. Which day it is. Days are worked out in America/Los_Angeles, never UTC,
 *     so a late close isn't counted as tomorrow.
 */

/* --- The web app ---------------------------------------------------------- */

/** GET ?date=YYYY-MM-DD → that day's counts (today if no date is given). */
function doGet(e) {
  var params = (e && e.parameter) || {};
  return respond(function () {
    var day = dayFrom(params.date);
    return {
      date: day,
      today: today(),
      counts: readDay(day),
      sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    };
  });
}

/**
 * POST { opId, date, deltas: { itemId: n } } → that day's counts
 * after the change.
 *
 * Sent as text/plain rather than JSON on purpose: a JSON content type makes
 * the browser ask permission first (a CORS "preflight"), and Apps Script has
 * no way to answer that, so the request would never be sent at all.
 */
function doPost(e) {
  return respond(function () {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return applyBatch(body);
  });
}

function respond(work) {
  var out;
  try {
    checkWholeFilePasted_();
    out = work();
    out.ok = true;
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/* --- Counting ------------------------------------------------------------- */

function applyBatch(body) {
  var opId = String(body.opId || '');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(opId)) throw new Error('Missing or malformed opId');

  var day = dayFrom(body.date);
  var deltas = cleanDeltas(body.deltas);

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get('op:' + opId)) {
      return { date: day, today: today(), counts: readDay(day, true), duplicate: true };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureCountsSheet(ss);
    var columns = columnMap(sheet);
    var row = findOrAddRow(sheet, day);
    var width = sheet.getLastColumn();
    var values = sheet.getRange(row, 1, 1, width).getValues()[0];

    var applied = [];
    ITEM_IDS.forEach(function (id) {
      var change = deltas[id];
      if (!change) return;
      var index = columns[ITEMS[id].label] - 1;
      var before = toCount(values[index]);
      // Never below zero. A "−" pressed on an item nobody else has counted yet
      // simply does nothing, and the log records only what really changed.
      var after = Math.max(0, before + change);
      if (after === before) return;
      values[index] = after;
      applied.push([id, after - before]);
    });

    var counts = countsFromRow(values, columns);
    values[columns.Total - 1] = sumCounts(counts);
    sheet.getRange(row, 1, 1, width).setValues([values]);

    if (applied.length) logChanges(ss, day, applied);

    SpreadsheetApp.flush();
    cache.put('op:' + opId, '1', 21600); // six hours — the longest the cache allows
    cache.put('day:' + day, JSON.stringify(counts), 20);

    return { date: day, today: today(), counts: counts };
  } finally {
    lock.releaseLock();
  }
}

/** Keeps only known items and whole numbers, and refuses anything wild. */
function cleanDeltas(raw) {
  var out = {};
  if (!raw || typeof raw !== 'object') return out;
  ITEM_IDS.forEach(function (id) {
    var n = Number(raw[id]);
    if (!isFinite(n)) return;
    n = Math.round(n);
    if (n === 0) return;
    if (Math.abs(n) > 500) throw new Error('Change for ' + id + ' is too large');
    out[id] = n;
  });
  return out;
}

/**
 * One day's counts, from a short-lived cache when there is one.
 *
 * Every device asks every few seconds, and reading the Sheet is the slow part.
 * Twenty seconds is short enough that a number typed into the Sheet by hand
 * shows on the iPads almost straight away, and every tap refreshes it anyway.
 */
function readDay(day, skipCache) {
  var cache = CacheService.getScriptCache();
  if (!skipCache) {
    var hit = cache.get('day:' + day);
    if (hit) return JSON.parse(hit);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COUNTS_SHEET);
  var counts = emptyCounts();
  if (sheet) {
    var row = findRow(sheet, day);
    if (row) {
      var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      counts = countsFromRow(values, columnMap(sheet));
    }
  }

  cache.put('day:' + day, JSON.stringify(counts), 20);
  return counts;
}

function emptyCounts() {
  var out = {};
  ITEM_IDS.forEach(function (id) {
    out[id] = 0;
  });
  return out;
}

function countsFromRow(values, columns) {
  var out = {};
  ITEM_IDS.forEach(function (id) {
    out[id] = toCount(values[columns[ITEMS[id].label] - 1]);
  });
  return out;
}

function sumCounts(counts) {
  return ITEM_IDS.reduce(function (total, id) {
    return total + counts[id];
  }, 0);
}

function toCount(value) {
  var n = Number(value);
  return isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/* --- Days ----------------------------------------------------------------- */

function today() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
}

/**
 * The day a request is about. An iPad that was offline at closing sends last
 * night's taps the next morning, labelled with last night's date, and they
 * belong there. Anything malformed, or more than a day in the future (a clock
 * set wrong), is treated as today.
 */
function dayFrom(value) {
  var now = today();
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return now;
  var tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), TIME_ZONE, 'yyyy-MM-dd');
  return value > tomorrow ? now : value;
}

/* --- The sheets themselves ------------------------------------------------ */

function headerLabels() {
  var labels = ['Date'];
  CATEGORIES.forEach(function (category) {
    category.items.forEach(function (pair) {
      labels.push(pair[1]);
    });
  });
  labels.push('Total');
  return labels;
}

function ensureCountsSheet(ss) {
  var sheet = ss.getSheetByName(COUNTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(COUNTS_SHEET);
    var labels = headerLabels();
    sheet.getRange(1, 1, 1, labels.length).setValues([labels]);
    styleHeader(sheet, labels.length);
  }
  return sheet;
}

function ensureLogSheet(ss) {
  var sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET);
    var labels = ['Timestamp', 'Date', 'Category', 'Item', 'Change'];
    sheet.getRange(1, 1, 1, labels.length).setValues([labels]);
    styleHeader(sheet, labels.length);
  }
  return sheet;
}

function styleHeader(sheet, width) {
  sheet
    .getRange(1, 1, 1, width)
    .setFontWeight('bold')
    .setBackground('#E51636')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}

/**
 * Header label → column number. Any item missing from the header (one added
 * to the list since the Sheet was made) gets a new column on the end, so
 * adding an item never needs anyone to touch the Sheet.
 */
function columnMap(sheet) {
  var width = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, width).getValues()[0];
  var map = {};
  header.forEach(function (label, i) {
    if (label !== '' && map[label] === undefined) map[label] = i + 1;
  });

  var wanted = ITEM_IDS.map(function (id) {
    return ITEMS[id].label;
  }).concat(['Total']);
  wanted.forEach(function (label) {
    if (map[label] !== undefined) return;
    width += 1;
    sheet.getRange(1, width).setValue(label);
    map[label] = width;
  });

  return map;
}

/** The row holding `day`, or 0. Dates are kept as plain text, never Sheets dates. */
function findRow(sheet, day) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var dates = sheet.getRange(2, 1, last - 1, 1).getDisplayValues();
  // Newest rows are at the bottom, and today is nearly always what is asked for.
  for (var i = dates.length - 1; i >= 0; i--) {
    if (dates[i][0] === day) return i + 2;
  }
  return 0;
}

function findOrAddRow(sheet, day) {
  var row = findRow(sheet, day);
  if (row) return row;

  row = sheet.getLastRow() + 1;
  var cell = sheet.getRange(row, 1);
  // Text, so Sheets doesn't turn "2026-10-21" into a date and display it as
  // "10/21/2026" — which would then never match the day we look for.
  cell.setNumberFormat('@');
  cell.setValue(day);
  var width = sheet.getLastColumn();
  var zeros = [];
  for (var c = 2; c <= width; c++) zeros.push(0);
  if (zeros.length) sheet.getRange(row, 2, 1, zeros.length).setValues([zeros]);
  return row;
}

function logChanges(ss, day, applied) {
  var sheet = ensureLogSheet(ss);
  var now = new Date();
  var rows = applied.map(function (entry) {
    var item = ITEMS[entry[0]];
    return [now, day, item.category, item.label, entry[1]];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
}

/* --- Set up, run once by hand --------------------------------------------- */

/**
 * Builds both tabs with their headings. Safe to run again at any time: it
 * never touches a count, and only adds headings that are missing.
 */
function setup() {
  checkWholeFilePasted_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TIME_ZONE);
  var counts = ensureCountsSheet(ss);
  columnMap(counts);
  ensureLogSheet(ss);

  // A brand-new spreadsheet comes with an empty "Sheet1"; tidy it away.
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

/** Adds a "Counter" menu to the Sheet so setup can be re-run without the editor. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Counter')
    .addItem('Set up / repair the tabs', 'setup')
    .addToUi();
}

/**
 * Kept at the very bottom on purpose: any paste that reaches `setup` also
 * reaches this, so the check is there whenever it is needed.
 *
 * Stops with a plain message if the top of this file didn't make it into the
 * editor. Copying a long file — especially on an iPad — easily drops its first
 * lines, and the error Google shows for that ("TIME_ZONE is not defined")
 * says nothing about what actually went wrong.
 *
 * `typeof` is used because it is the one way to ask about a name that may
 * never have been declared without that question itself being the error.
 */
function checkWholeFilePasted_() {
  if (
    typeof TIME_ZONE === 'undefined' ||
    typeof COUNTS_SHEET === 'undefined' ||
    typeof LOG_SHEET === 'undefined' ||
    typeof CATEGORIES === 'undefined' ||
    typeof ITEMS === 'undefined' ||
    typeof ITEM_IDS === 'undefined' ||
    ITEM_IDS.length === 0
  ) {
    throw new Error(
      'Only part of Code.gs was pasted. Delete everything in this editor, paste the ' +
        'whole file again (it starts with "===== START OF Code.gs" and ends with ' +
        '"===== END OF Code.gs"), press Save, and run setup again.',
    );
  }
}

// ===== END OF Code.gs — if you can see this, everything was pasted =====
