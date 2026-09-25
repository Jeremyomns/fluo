import { useId } from 'react';
import s from './Ribbon.module.css';

/**
 * Ruban décoratif de l'en-tête : une boucle orange qui s'étire en traîne jaune,
 * croisée par un ruban bleu. Purement décoratif (ignoré par les lecteurs d'écran),
 * placé derrière le contenu et hors des zones de texte.
 */
export function Ribbon() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={s.ribbon} viewBox="0 0 640 220" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}o`} gradientUnits="userSpaceOnUse" x1="300" y1="0" x2="640" y2="0">
          <stop offset="0" style={{ stopColor: '#e4501e' }} />
          <stop offset="0.22" style={{ stopColor: 'var(--fluo)' }} />
          <stop offset="0.62" style={{ stopColor: '#f7cf63' }} />
          <stop offset="1" style={{ stopColor: '#fbe7a6', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id={`${id}b`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="450" y2="0">
          <stop offset="0" style={{ stopColor: '#bfe6f7', stopOpacity: 0 }} />
          <stop offset="0.3" style={{ stopColor: '#a9d9f1' }} />
          <stop offset="0.7" style={{ stopColor: '#5e8cc0' }} />
          <stop offset="1" style={{ stopColor: '#1d2b7a' }} />
        </linearGradient>
      </defs>
      {/* la boucle orange passe derrière le ruban bleu */}
      <path
        fill={`url(#${id}o)`}
        d="M372 196C330 160 300 118 312 88C326 52 400 40 520 40C570 40 610 44 640 50L640 58C600 54 560 52 520 53C430 56 368 66 356 92C348 114 372 152 404 186Z"
      />
      <path fill={`url(#${id}b)`} d="M0 70C140 78 300 120 420 172C446 184 452 206 430 212C414 217 394 211 372 201C262 152 128 112 0 102Z" />
    </svg>
  );
}
