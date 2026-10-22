import { useEffect } from 'react';
import { backend } from './backend';
import { unlock } from './feedback';
import { start } from './store';
import { DemoBanner } from './components/DemoBanner';
import { CounterScreen } from './screens/CounterScreen';

export default function App() {
  useEffect(() => start(), []);

  // Sound can only start after a touch. Any touch anywhere arms it.
  useEffect(() => {
    const arm = () => unlock();
    window.addEventListener('pointerdown', arm);
    return () => window.removeEventListener('pointerdown', arm);
  }, []);

  return (
    <div className={`app${backend.demo ? ' has-banner' : ''}`}>
      <CounterScreen />
      {backend.demo && <DemoBanner />}
    </div>
  );
}
