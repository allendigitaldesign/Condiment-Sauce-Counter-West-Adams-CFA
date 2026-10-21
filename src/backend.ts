/**
 * Where the counts actually live.
 *
 * There are two implementations behind one small interface:
 *
 *   sheetBackend  the real one — the Google Sheet, through the Apps Script
 *                 web app in apps-script/Code.gs, shared by every iPad
 *   demoBackend   a stand-in that keeps everything in this browser only, used
 *                 when no Sheet address has been configured yet so the app can
 *                 be looked at and tapped before any setup is done
 *
 * Nothing above this file knows which one it is talking to, apart from the
 * `demo` flag it uses to put a warning banner on screen.
 */

import { ITEM_IDS } from './items';

export type Counts = Record<string, number>;

export type Station = 'Front Counter' | 'Drive Thru';

/** One batch of taps, sent together. `opId` lets the Sheet ignore a resend. */
export type Batch = {
  opId: string;
  station: Station;
  date: string;
  deltas: Counts;
};

export type DayCounts = { date: string; counts: Counts; sheetUrl?: string };

/**
 * Something went wrong. `retry` is true when it is worth sending the same
 * thing again later (no wifi, Google having a moment) and false when the Sheet
 * looked at the request and refused it, where sending it again would only be
 * refused again.
 */
export type Failure = { failed: true; retry: boolean; message: string };

/** Every method resolves to the day's counts, or a Failure. */
export type Backend = {
  demo: boolean;
  load(date: string): Promise<DayCounts | Failure>;
  send(batch: Batch): Promise<DayCounts | Failure>;
};

export const isFailure = (value: DayCounts | Failure): value is Failure => 'failed' in value;

const failure = (message: string, retry = true): Failure => ({ failed: true, retry, message });

/* --- The real one --------------------------------------------------------- */

const SHEET_URL = import.meta.env.VITE_SHEET_URL?.trim() ?? '';

type Reply = {
  ok: boolean;
  error?: string;
  date: string;
  counts: Counts;
  sheetUrl?: string;
};

/**
 * Apps Script answers every request with a redirect to a second Google
 * address, which the browser follows by itself. If the web app hasn't been
 * shared with "Anyone", that second page is a Google sign-in page instead —
 * HTML, not JSON — which is why a reply that won't parse gets its own message.
 */
async function ask(init?: RequestInit, query = ''): Promise<DayCounts | Failure> {
  let response: Response;
  try {
    response = await fetch(SHEET_URL + query, { redirect: 'follow', ...init });
  } catch {
    return failure('No connection to the Google Sheet.');
  }

  if (!response.ok) return failure(`The Google Sheet answered ${response.status}.`);

  let reply: Reply;
  try {
    reply = (await response.json()) as Reply;
  } catch {
    return failure(
      "The Google Sheet didn't answer properly — check its web app is shared with “Anyone”.",
    );
  }

  if (!reply.ok) return failure(reply.error ?? 'The Google Sheet refused that.', false);
  return { date: reply.date, counts: reply.counts, sheetUrl: reply.sheetUrl };
}

const sheetBackend: Backend = {
  demo: false,

  load(date) {
    const join = SHEET_URL.includes('?') ? '&' : '?';
    return ask({ method: 'GET' }, `${join}date=${encodeURIComponent(date)}`);
  },

  send(batch) {
    return ask({
      method: 'POST',
      // text/plain, not application/json: see doPost in apps-script/Code.gs.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(batch),
    });
  },
};

/* --- The stand-in --------------------------------------------------------- */

const DEMO_KEY = 'cfa-counter:demo-counts';

function readDemo(): Record<string, Counts> {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}') as Record<string, Counts>;
  } catch {
    return {};
  }
}

function dayOf(all: Record<string, Counts>, date: string): Counts {
  const out: Counts = {};
  for (const id of ITEM_IDS) out[id] = all[date]?.[id] ?? 0;
  return out;
}

const seenOps = new Set<string>();

const demoBackend: Backend = {
  demo: true,

  async load(date) {
    return { date, counts: dayOf(readDemo(), date) };
  },

  async send(batch) {
    const all = readDemo();
    const counts = dayOf(all, batch.date);
    if (!seenOps.has(batch.opId)) {
      seenOps.add(batch.opId);
      for (const [id, change] of Object.entries(batch.deltas)) {
        if (id in counts) counts[id] = Math.max(0, counts[id] + change);
      }
      all[batch.date] = counts;
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(all));
      } catch {
        // Storage full or switched off. Demo mode only; the screen still works.
      }
    }
    return { date: batch.date, counts };
  },
};

export const backend: Backend = SHEET_URL ? sheetBackend : demoBackend;
