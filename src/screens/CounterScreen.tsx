import { useEffect, useState, type CSSProperties } from 'react';
import { backend } from '../backend';
import { dayLabel } from '../dates';
import { counted, isMuted, onMuteChange, setMuted, uncounted } from '../feedback';
import { CATEGORIES, LANDSCAPE_COLUMNS, type Category } from '../items';
import { dismissProblem, tap, useCounter, type CounterState } from '../store';
import { ItemTile } from '../components/ItemTile';

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function CounterScreen() {
  const state = useCounter();
  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => onMuteChange(() => setMutedState(isMuted())), []);

  const total = Object.values(state.counts).reduce((a, b) => a + b, 0);

  function change(id: string, by: number): boolean {
    const ok = tap(id, by);
    if (ok) {
      if (by > 0) counted();
      else uncounted();
    }
    return ok;
  }

  return (
    <>
      <header className="header">
        <div className="header-top">
          <div className="header-titles">
            <h1>Sauce &amp; Condiment Counter</h1>
            <p className="subtitle">
              West Adams · {dayLabel(state.today)}
            </p>
          </div>
          <div className="header-buttons">
            <SyncPill state={state} />
            <span className="header-total" aria-label={`${total} handed out today`}>
              <strong>{total}</strong> today
            </span>
            <button
              type="button"
              className="header-link is-icon"
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
              title={muted ? 'Sound off' : 'Sound on'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      </header>

      {state.problem && (
        <div className="notice notice-row" role="alert">
          <span>{state.problem}</span>
          <button type="button" className="notice-close" onClick={dismissProblem} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {state.partial && state.status === 'offline' && (
        <div className="notice">
          Can't reach the Google Sheet yet. Keep tapping — counts are saved on
          this iPad and added to the Sheet as soon as it reconnects. Until then
          the numbers show this iPad's taps only.
        </div>
      )}

      <main className={`columns${state.partial ? ' is-partial' : ''}`}>
        {LANDSCAPE_COLUMNS.map((column) => (
          <div className="column" key={column.join()}>
            {column.map((id) => {
              const category = BY_ID.get(id)!;
              return (
                <Section
                  key={id}
                  category={category}
                  counts={state.counts}
                  onChange={change}
                />
              );
            })}
          </div>
        ))}
      </main>

      <footer className="footer">
        Press and hold an item to type in how many. Counts start again at zero
        each day. Every tap is saved to the Google Sheet
        {backend.demo ? ' once it is connected' : ''}.
        {state.sheetUrl && (
          <>
            {' '}
            <a href={state.sheetUrl} target="_blank" rel="noreferrer">
              Open the Sheet
            </a>
          </>
        )}
      </footer>
    </>
  );
}

function Section({
  category,
  counts,
  onChange,
}: {
  category: Category;
  counts: CounterState['counts'];
  onChange(id: string, by: number): boolean;
}) {
  const subtotal = category.items.reduce((sum, item) => sum + (counts[item.id] ?? 0), 0);

  return (
    <section
      className={`section section-${category.id}`}
      aria-label={category.label}
      style={{ '--rows': Math.ceil(category.items.length / 4) } as CSSProperties}
    >
      <div className="section-head">
        <h2>{category.label}</h2>
        <span className="section-total">{subtotal}</span>
      </div>
      <div className="tiles">
        {category.items.map((item) => (
          <ItemTile
            key={item.id}
            item={item}
            count={counts[item.id] ?? 0}
            onChange={(by) => onChange(item.id, by)}
          />
        ))}
      </div>
    </section>
  );
}

function SyncPill({ state }: { state: CounterState }) {
  if (backend.demo) return null;

  const label =
    state.status === 'offline'
      ? state.waiting > 0
        ? `Offline · ${state.waiting} waiting`
        : 'Offline'
      : state.status === 'loading'
        ? 'Connecting…'
        : state.status === 'saving'
          ? 'Saving…'
          : 'Live';

  return (
    <span className={`sync-pill is-${state.status}`} role="status">
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
