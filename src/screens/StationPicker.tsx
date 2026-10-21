import type { Station } from '../backend';
import { STATIONS } from '../station';

type Props = {
  current: Station | null;
  onPick(station: Station): void;
  onCancel?(): void;
};

/** Asked once on each iPad, so the Tap Log knows where each count came from. */
export function StationPicker({ current, onPick, onCancel }: Props) {
  return (
    <div className="picker">
      <div className="panel picker-panel">
        <h2>Which iPad is this?</h2>
        <p>
          Both iPads count into the same numbers. This only labels where each
          tap came from in the Sheet's Tap Log. It's remembered on this iPad.
        </p>
        <div className="picker-options">
          {STATIONS.map((station) => (
            <button
              key={station}
              type="button"
              className={`picker-option${station === current ? ' is-current' : ''}`}
              onClick={() => onPick(station)}
            >
              {station}
            </button>
          ))}
        </div>
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
