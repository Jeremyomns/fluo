import { type TouchEvent, useRef, useState } from 'react';

const THRESHOLD = 80; // px à parcourir pour déclencher l'action
const LOCK = 10; // px avant de décider entre défilement vertical et balayage

interface Options {
  onRight?: () => void; // glisser vers la droite
  onLeft?: () => void; // glisser vers la gauche
}

/**
 * Balayage horizontal au doigt. Le défilement vertical reste libre (le geste se « verrouille »
 * dans une direction après quelques pixels). Une direction sans action résiste et revient.
 */
export function useSwipe({ onRight, onLeft }: Options) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; axis: 'h' | 'v' | null } | null>(null);
  const armed = useRef(false);

  const onTouchStart = (e: TouchEvent) => {
    if (leaving || e.touches.length > 1) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
  };

  const onTouchMove = (e: TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.touches[0].clientX - s.x;
    const my = e.touches[0].clientY - s.y;
    if (!s.axis) {
      if (Math.abs(mx) < LOCK && Math.abs(my) < LOCK) return;
      s.axis = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
    }
    if (s.axis !== 'h') return;
    if (!dragging) setDragging(true);
    const allowed = mx > 0 ? !!onRight : !!onLeft;
    const value = allowed ? mx : mx * 0.2; // résistance si pas d'action dans ce sens
    setDx(value);
    const past = allowed && Math.abs(value) >= THRESHOLD;
    if (past !== armed.current) {
      armed.current = past;
      if (past) navigator.vibrate?.(8); // petit retour haptique (Android)
    }
  };

  const onTouchEnd = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s || s.axis !== 'h') return;
    const go = armed.current;
    armed.current = false;
    const fire = (dir: 'left' | 'right', action: () => void) => {
      setLeaving(dir);
      window.setTimeout(action, 180);
      // Filet de sécurité : si la tâche est toujours là (action refusée), elle revient à sa place.
      window.setTimeout(() => {
        setLeaving(null);
        setDx(0);
      }, 1500);
    };
    if (go && dx > 0 && onRight) fire('right', onRight);
    else if (go && dx < 0 && onLeft) fire('left', onLeft);
    else setDx(0);
  };

  return {
    dx: leaving === 'right' ? 1000 : leaving === 'left' ? -1000 : dx,
    dragging,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
