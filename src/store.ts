/**
 * Keeps this device's numbers in step with the Sheet, and with every other
 * device using the app — all of them count into the same tallies.
 *
 * HOW A TAP TRAVELS
 *
 *   tap ──► pending ──► in flight ──► the Sheet
 *
 * A tap goes into `pending` and shows on screen at once. About half a second
 * later everything pending is sent as one batch, which becomes `inFlight`
 * until the Sheet answers. Only one batch is ever in flight. Both are saved on
 * the device as they change, so a reload, a dead battery or a wifi outage in
 * the middle of a rush loses nothing: whatever was waiting is sent when the
 * app next can.
 *
 * A batch that is sent again — because the answer to the first try never
 * arrived — keeps its id, and the Sheet ignores an id it has already counted.
 *
 * WHAT THE SCREEN SHOWS
 *
 *   the Sheet's last answer + the batch in flight + what is pending
 *
 * Every other device's taps arrive by asking the Sheet every few seconds. An
 * answer to that question is thrown away if a batch was sent or answered
 * while it was being asked, because it might then count this iPad's taps
 * twice (once in the Sheet's number, once in flight) or not at all.
 */

import { useSyncExternalStore } from 'react';
import { backend, isFailure, type Batch, type Counts } from './backend';
import { storeToday } from './dates';
import { ALL_ITEMS } from './items';

const QUEUE_KEY = 'cfa-counter:queue';
const LAST_KEY = 'cfa-counter:last';

const SEND_AFTER_MS = 500;
const POLL_EVERY_MS = 3000;
const DAY_CHECK_MS = 15000;
const MAX_PER_BATCH = 500;

export type SyncStatus = 'loading' | 'live' | 'saving' | 'offline';

export type CounterState = {
  today: string;
  /** Today's counts as everybody should see them. */
  counts: Counts;
  /**
   * True until the Sheet has answered for today. The counts are then only
   * this iPad's own taps, and the screen says so rather than passing them off
   * as the store's totals.
   */
  partial: boolean;
  status: SyncStatus;
  /** Taps on this iPad not yet confirmed by the Sheet. */
  waiting: number;
  /** A refusal from the Sheet worth showing someone. */
  problem: string | null;
  sheetUrl: string | null;
};

type Queue = { pending: Record<string, Counts>; inFlight: Batch | null };
type Last = { date: string; counts: Counts; sheetUrl?: string };

/* --- Saved on the device -------------------------------------------------- */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or switched off. The counts still go to the Sheet; only
    // the safety net for a reload mid-send is missing.
  }
}

/* --- State ---------------------------------------------------------------- */

let today = storeToday();
let queue: Queue = read<Queue>(QUEUE_KEY, { pending: {}, inFlight: null });
let last: Last | null = read<Last | null>(LAST_KEY, null);
let status: SyncStatus = 'loading';
let problem: string | null = null;
let sending = false;
/** Bumped whenever a send starts or ends; see "WHAT THE SCREEN SHOWS". */
let epoch = 0;
let sendTimer: number | undefined;
let retryDelay = 2000;

const listeners = new Set<() => void>();
let snapshot: CounterState = build();

function build(): CounterState {
  const base = last && last.date === today ? last.counts : null;
  const flying = queue.inFlight?.date === today ? queue.inFlight.deltas : {};
  const pending = queue.pending[today] ?? {};
  const counts: Counts = {};
  for (const { id } of ALL_ITEMS) {
    counts[id] = Math.max(0, (base?.[id] ?? 0) + (flying[id] ?? 0) + (pending[id] ?? 0));
  }

  return {
    today,
    counts,
    partial: base === null,
    status: status === 'live' && waitingTaps() > 0 ? 'saving' : status,
    waiting: waitingTaps(),
    problem,
    sheetUrl: last?.sheetUrl ?? null,
  };
}

function waitingTaps(): number {
  let total = 0;
  const batches = [...Object.values(queue.pending)];
  if (queue.inFlight) batches.push(queue.inFlight.deltas);
  for (const deltas of batches) {
    for (const n of Object.values(deltas)) total += Math.abs(n);
  }
  return total;
}

function changed(): void {
  snapshot = build();
  for (const listener of listeners) listener();
}

function saveQueue(): void {
  write(QUEUE_KEY, queue);
}

/* --- Tapping -------------------------------------------------------------- */

/**
 * Count more (or fewer) of an item: one for a tap, or a typed-in amount from
 * pressing and holding. Returns false for a change that would take the count
 * below zero.
 *
 * Taps are taken even before the Sheet has answered — wifi down at opening is
 * exactly when nobody should have to stop and write counts on paper.
 */
export function tap(id: string, change: number): boolean {
  if (!Number.isInteger(change) || change === 0) return false;
  if (change < 0 && (snapshot.counts[id] ?? 0) + change < 0) return false;

  const day = (queue.pending[today] ??= {});
  day[id] = (day[id] ?? 0) + change;
  if (day[id] === 0) delete day[id];
  if (Object.keys(day).length === 0) delete queue.pending[today];
  saveQueue();
  changed();
  scheduleSend(SEND_AFTER_MS);
  return true;
}

function scheduleSend(ms: number): void {
  if (sendTimer !== undefined) return;
  sendTimer = window.setTimeout(() => {
    sendTimer = undefined;
    void send();
  }, ms);
}

function newOpId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function send(): Promise<void> {
  if (sending) return;

  if (!queue.inFlight) {
    // Oldest day first, so last night's offline taps go before this morning's.
    const day = Object.keys(queue.pending).sort()[0];
    if (!day) return;
    const { now, later } = splitBatch(queue.pending[day]);
    queue.inFlight = { opId: newOpId(), date: day, deltas: now };
    if (later) queue.pending[day] = later;
    else delete queue.pending[day];
    saveQueue();
  }

  const batch = queue.inFlight!;
  sending = true;
  epoch++;
  const result = await backend.send(batch);
  sending = false;
  epoch++;

  if (isFailure(result)) {
    if (result.retry) {
      status = 'offline';
      changed();
      scheduleSend(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15000);
      return;
    }
    // Refused outright. Sending it again would be refused again and hold up
    // every tap behind it, so let it go and say so.
    problem = `Some taps weren't saved: ${result.message}`;
    queue.inFlight = null;
    saveQueue();
    changed();
    if (Object.keys(queue.pending).length) scheduleSend(0);
    return;
  }

  retryDelay = 2000;
  queue.inFlight = null;
  saveQueue();
  if (result.date === today) remember(result.date, result.counts, result.sheetUrl);
  status = 'live';
  changed();
  if (Object.keys(queue.pending).length) scheduleSend(SEND_AFTER_MS);
}

/**
 * The script refuses a batch that changes one item by more than
 * MAX_PER_BATCH (`cleanDeltas` in Code.gs), and a refused batch is dropped.
 * Typed-in amounts can add up past that, so anything over it waits for the
 * next batch instead.
 */
function splitBatch(deltas: Counts): { now: Counts; later: Counts | null } {
  const now: Counts = {};
  const later: Counts = {};
  for (const [id, n] of Object.entries(deltas)) {
    const part = Math.max(-MAX_PER_BATCH, Math.min(MAX_PER_BATCH, n));
    now[id] = part;
    if (n !== part) later[id] = n - part;
  }
  return { now, later: Object.keys(later).length ? later : null };
}

function remember(date: string, counts: Counts, sheetUrl?: string): void {
  last = { date, counts, sheetUrl: sheetUrl ?? last?.sheetUrl };
  write(LAST_KEY, last);
}

/* --- Hearing about the other devices -------------------------------------- */

async function refresh(): Promise<void> {
  if (sending) return;
  const askedAt = epoch;
  const day = today;
  const result = await backend.load(day);
  if (askedAt !== epoch || day !== today) return;

  if (isFailure(result)) {
    if (result.retry) status = 'offline';
    else problem = result.message;
  } else {
    remember(result.date, result.counts, result.sheetUrl);
    if (status !== 'live') status = 'live';
  }
  changed();

  // Back online with taps still waiting: send them now rather than waiting
  // out the retry timer.
  if (status === 'live' && waitingTaps() > 0 && !sending) {
    window.clearTimeout(sendTimer);
    sendTimer = undefined;
    scheduleSend(0);
  }
}

function checkDay(): void {
  const now = storeToday();
  if (now === today) return;
  today = now;
  status = 'loading';
  changed();
  void refresh();
}

/* --- Starting up ---------------------------------------------------------- */

let started = false;

/** Begin syncing. Called once, when the app first appears. */
export function start(): void {
  if (started) return;
  started = true;

  void refresh();
  if (waitingTaps() > 0) scheduleSend(0);

  // Only while the screen is showing: a sleeping iPad asking the Sheet every
  // three seconds all night is wasted effort for Google and for the battery.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void refresh();
  }, POLL_EVERY_MS);
  window.setInterval(checkDay, DAY_CHECK_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkDay();
      void refresh();
    }
  });
  window.addEventListener('online', () => void refresh());
}

export function dismissProblem(): void {
  problem = null;
  changed();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCounter(): CounterState {
  return useSyncExternalStore(subscribe, () => snapshot);
}
