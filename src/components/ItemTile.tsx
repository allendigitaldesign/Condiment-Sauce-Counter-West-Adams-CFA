import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Item } from '../items';
import { AmountPad } from './AmountPad';

/** How long a press has to last to open the number pad instead of adding one. */
const HOLD_MS = 500;
/** A finger that drifts further than this is scrolling, not holding. */
const HOLD_SLOP_PX = 10;

type Props = {
  item: Item;
  count: number;
  /** Returns false when the change was refused (a "−" at zero). */
  onChange(change: number): boolean;
};

/**
 * One item. The whole tile is the "+1" — it is what gets hit hundreds of times
 * a shift, so it is as big as the screen allows. The small "−" in the corner
 * is only for taking back a mistap.
 *
 * Pressing and holding the tile opens a number pad instead, for handing out
 * several at once.
 */
export function ItemTile({ item, count, onChange }: Props) {
  // Bumped on every tap made here, to replay the flash. Counts arriving from
  // the other iPad change the number quietly, without a flash, so it is clear
  // which taps were yours.
  const [bump, setBump] = useState(0);
  const [lastChange, setLastChange] = useState(1);
  const [padOpen, setPadOpen] = useState(false);

  const holdTimer = useRef<number | undefined>(undefined);
  const holdStart = useRef<{ x: number; y: number } | null>(null);
  // Set when a hold opened the pad, so lifting the finger doesn't also add one.
  const held = useRef(false);

  function change(by: number) {
    if (onChange(by)) {
      setLastChange(by);
      setBump((b) => b + 1);
    }
  }

  function cancelHold() {
    window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    holdStart.current = null;
  }

  function startHold(e: PointerEvent) {
    if (e.button !== 0) return;
    // Reset here rather than on click: if the finger lifted somewhere else,
    // that click never came, and the next real tap would be swallowed.
    held.current = false;
    cancelHold();
    holdStart.current = { x: e.clientX, y: e.clientY };
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined;
      held.current = true;
      setPadOpen(true);
    }, HOLD_MS);
  }

  function moveHold(e: PointerEvent) {
    const start = holdStart.current;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > HOLD_SLOP_PX) cancelHold();
  }

  useEffect(() => cancelHold, []);

  return (
    <div className={`tile${count > 0 ? ' has-count' : ''}`}>
      <button
        type="button"
        className="tile-add"
        onClick={() => {
          if (held.current) {
            held.current = false;
            return;
          }
          change(1);
        }}
        onPointerDown={startHold}
        onPointerMove={moveHold}
        onPointerUp={cancelHold}
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${item.label}: ${count}. Tap to add one, or press and hold to type an amount.`}
      >
        {bump > 0 && (
          <span
            key={bump}
            className={`tile-flash${lastChange < 0 ? ' is-minus' : ''}`}
            aria-hidden="true"
          />
        )}
        <span className="tile-name">{item.label}</span>
        <span key={`n${bump}`} className={`tile-count${bump > 0 ? ' is-bumped' : ''}`}>
          {count}
        </span>
      </button>
      <button
        type="button"
        className="tile-minus"
        onClick={() => change(-1)}
        disabled={count <= 0}
        aria-label={`Take one ${item.label} back`}
      >
        −
      </button>
      {padOpen && (
        <AmountPad
          label={item.label}
          onAdd={(amount) => {
            setPadOpen(false);
            change(amount);
          }}
          onClose={() => setPadOpen(false)}
        />
      )}
    </div>
  );
}
