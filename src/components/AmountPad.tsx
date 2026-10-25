import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Three digits: enough for a case, short enough that a slip can't add 10,000. */
const MAX_DIGITS = 3;

type Props = {
  label: string;
  onAdd(amount: number): void;
  onClose(): void;
};

/**
 * The number pad that opens when a tile is pressed and held, for adding
 * several at once without tapping each one.
 *
 * Its own keys rather than the iPad's keyboard: they are big, they are always
 * digits, and nothing slides up over the tiles. A real keyboard works too
 * (digits, Backspace, Enter, Escape), which is handy at a desk.
 *
 * Drawn into <body> rather than inside the tile, so the tile's pressed-in
 * scaling can't pull a fixed overlay along with it.
 */
export function AmountPad({ label, onAdd, onClose }: Props) {
  const [digits, setDigits] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  // The finger that held the tile down is still on the glass when the pad
  // appears, and lifting it "clicks" whatever is now underneath: a key, or
  // the backdrop, which would close the pad at once. So nothing in here
  // counts as a click until a touch has started in here.
  const armed = useRef(false);
  const amount = Number(digits || '0');

  function press(key: string) {
    setDigits((d) => (d.length >= MAX_DIGITS || (d === '' && key === '0') ? d : d + key));
  }

  function back() {
    setDigits((d) => d.slice(0, -1));
  }

  function add() {
    if (amount > 0) onAdd(amount);
  }

  useEffect(() => {
    dialog.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      armed.current = true;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
      else if (e.key === 'Enter') add();
      else if (e.key === 'Escape') onClose();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div
      className="pad-backdrop"
      onPointerDownCapture={() => {
        armed.current = true;
      }}
      onClickCapture={(e) => {
        if (!armed.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className="pad"
        role="dialog"
        aria-modal="true"
        aria-label={`How many ${label} to add`}
        tabIndex={-1}
      >
        <div className="pad-head">
          <span className="pad-title">Add {label}</span>
          <button type="button" className="pad-close" onClick={onClose} aria-label="Cancel">
            ✕
          </button>
        </div>
        <div className={`pad-amount${digits ? '' : ' is-empty'}`} aria-live="polite">
          {digits || '0'}
        </div>
        <div className="pad-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
            <button type="button" key={k} className="pad-key" onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button
            type="button"
            className="pad-key is-quiet"
            onClick={() => setDigits('')}
            aria-label="Clear"
          >
            C
          </button>
          <button type="button" className="pad-key" onClick={() => press('0')}>
            0
          </button>
          <button type="button" className="pad-key is-quiet" onClick={back} aria-label="Delete">
            ⌫
          </button>
        </div>
        <button type="button" className="button pad-add" onClick={add} disabled={amount <= 0}>
          {amount > 0 ? `Add ${amount}` : 'Type an amount'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
