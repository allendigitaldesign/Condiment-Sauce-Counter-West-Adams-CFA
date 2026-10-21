import { useEffect, useState } from 'react';
import { backend, type Station } from './backend';
import { unlock } from './feedback';
import { loadStation, saveStation } from './station';
import { setStation as tellStore, start } from './store';
import { DemoBanner } from './components/DemoBanner';
import { CounterScreen } from './screens/CounterScreen';
import { StationPicker } from './screens/StationPicker';

export default function App() {
  const [station, setStation] = useState<Station | null>(loadStation);
  const [picking, setPicking] = useState(station === null);

  useEffect(() => {
    if (station) start(station);
  }, [station]);

  // Sound can only start after a touch. Any touch anywhere arms it.
  useEffect(() => {
    const arm = () => unlock();
    window.addEventListener('pointerdown', arm);
    return () => window.removeEventListener('pointerdown', arm);
  }, []);

  function pick(next: Station) {
    saveStation(next);
    tellStore(next);
    setStation(next);
    setPicking(false);
  }

  return (
    <div className={`app${backend.demo ? ' has-banner' : ''}`}>
      {station && <CounterScreen station={station} onSwitchStation={() => setPicking(true)} />}
      {picking && (
        <StationPicker
          current={station}
          onPick={pick}
          onCancel={station ? () => setPicking(false) : undefined}
        />
      )}
      {backend.demo && <DemoBanner />}
    </div>
  );
}
