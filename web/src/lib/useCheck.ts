import { useEffect, useRef, useState } from 'react';

const CHECK_DELAY_MS = 550; // le temps de voir la coche avant que la tâche ne bouge

/** Coche animée : l'état « en train de cocher » précède l'enregistrement ; un second clic annule. */
export function useCheck(done: boolean, onToggle: (completed: boolean) => void) {
  const [checking, setChecking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCheck = () => {
    if (done) return onToggle(false);
    if (checking) {
      window.clearTimeout(timer.current);
      return setChecking(false);
    }
    setChecking(true);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(() => {
      setChecking(false);
      onToggle(true);
    }, reduced ? 0 : CHECK_DELAY_MS);
  };

  return { checking, handleCheck };
}
