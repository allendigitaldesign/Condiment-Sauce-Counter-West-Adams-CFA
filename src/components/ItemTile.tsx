import { useState } from 'react';
import type { Item } from '../items';

type Props = {
  item: Item;
  count: number;
  /** Returns false when the change was refused (a "−" at zero). */
  onChange(change: 1 | -1): boolean;
};

/**
 * One item. The whole tile is the "+1" — it is what gets hit hundreds of times
 * a shift, so it is as big as the screen allows. The small "−" in the corner
 * is only for taking back a mistap.
 */
export function ItemTile({ item, count, onChange }: Props) {
  // Bumped on every tap made here, to replay the flash. Counts arriving from
  // the other iPad change the number quietly, without a flash, so it is clear
  // which taps were yours.
  const [bump, setBump] = useState(0);
  const [lastChange, setLastChange] = useState<1 | -1>(1);

  function change(by: 1 | -1) {
    if (onChange(by)) {
      setLastChange(by);
      setBump((b) => b + 1);
    }
  }

  return (
    <div className={`tile${count > 0 ? ' has-count' : ''}`}>
      <button
        type="button"
        className="tile-add"
        onClick={() => change(1)}
        aria-label={`${item.label}: ${count}. Tap to add one.`}
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
    </div>
  );
}
