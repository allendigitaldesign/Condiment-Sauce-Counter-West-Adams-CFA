import { useState } from 'react';

/**
 * Shown when no Google Sheet has been connected yet. The app still works, but
 * only on this one iPad — this makes sure nobody mistakes it for the real thing.
 */
export function DemoBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="demo-banner">
      <div className="demo-banner-row">
        <span>
          <strong>Demo mode</strong> — counts saved only on this device.
        </span>
        <button type="button" onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Why?'}
        </button>
      </div>

      {open && (
        <div className="demo-banner-detail">
          <p>
            The app hasn't been connected to its Google Sheet yet, so nothing
            is shared. Everything you tap here stays in this browser, the other
            iPad can't see it, and none of it reaches the Sheet.
          </p>
          <p>
            Once the Sheet is connected, this banner disappears and both iPads
            count into the same numbers.
          </p>
        </div>
      )}
    </div>
  );
}
