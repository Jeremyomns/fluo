import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuickAdd } from './quickAdd';

const TODAY = '2026-09-25'; // un vendredi
const cats = [
  { id: 'maison', name: 'Maison' },
  { id: 'admin', name: 'Administratif' },
  { id: 'sante', name: 'Santé & sport' },
];
const p = (s: string) => parseQuickAdd(s, TODAY, cats);

test('texte simple', () => assert.deepEqual(p('Acheter du pain'), { title: 'Acheter du pain' }));
test('exemple complet', () =>
  assert.deepEqual(p('Vétérinaire lundi !haute #maison'), {
    title: 'Vétérinaire', dueDate: '2026-09-28', priority: 1, categoryId: 'maison',
  }));
test('demain / après-demain', () => {
  assert.equal(p('Poubelles demain').dueDate, '2026-09-26');
  assert.equal(p('Poubelles après-demain').dueDate, '2026-09-27');
  assert.equal(p('Poubelles apres demain').dueDate, '2026-09-27');
});
test("aujourd'hui avec apostrophe typographique", () => assert.equal(p('Truc aujourd’hui').dueDate, TODAY));
test('même jour de semaine = semaine suivante', () => assert.equal(p('Réunion vendredi').dueDate, '2026-10-02'));
test('lundi prochain', () => assert.deepEqual(p('Dentiste lundi prochain'), { title: 'Dentiste', dueDate: '2026-09-28' }));
test('mot de liaison retiré', () => assert.equal(p('Cadeau pour samedi').title, 'Cadeau'));
test('dans N jours / semaines / mois', () => {
  assert.equal(p('X dans 3 jours').dueDate, '2026-09-28');
  assert.equal(p('X dans 2 semaines').dueDate, '2026-10-09');
  assert.equal(p('X dans 1 mois').dueDate, '2026-10-25');
});
test('date numérique', () => {
  assert.equal(p('Impôts 15/10').dueDate, '2026-10-15');
  assert.equal(p('Impôts 03/01').dueDate, '2027-01-03'); // déjà passée → an prochain
  assert.equal(p('Impôts 31/02').dueDate, undefined);
  assert.equal(p('Impôts 15/10/27').dueDate, '2027-10-15');
});
test('date en toutes lettres', () => {
  assert.deepEqual(p('Anniv Léa 12 octobre'), { title: 'Anniv Léa', dueDate: '2026-10-12' });
  assert.equal(p('Truc le 3 janv').dueDate, '2027-01-03');
});
test('le 12 (jour du mois)', () => {
  assert.equal(p('Loyer le 30').dueDate, '2026-09-30');
  assert.equal(p('Loyer le 5').dueDate, '2026-10-05');
});
test('les nombres seuls restent du texte', () => assert.deepEqual(p('Acheter 3 pommes'), { title: 'Acheter 3 pommes' }));
test('catégorie par préfixe et sans accent', () => {
  assert.equal(p('Mutuelle #admin').categoryId, 'admin');
  assert.equal(p('Course #sante').categoryId, 'sante');
});
test('catégorie inconnue laissée dans le titre', () => assert.deepEqual(p('Truc #inconnu'), { title: 'Truc #inconnu' }));
test('priorités', () => {
  assert.equal(p('A !!').priority, 1);
  assert.equal(p('A !b').priority, 3);
});
test('seule la première date compte', () => {
  const r = p('Appeler lundi pour mardi');
  assert.equal(r.dueDate, '2026-09-28');
  assert.equal(r.title, 'Appeler pour mardi');
});
test('mots ordinaires non pris pour des jours', () => {
  assert.deepEqual(p('Appeler Sam'), { title: 'Appeler Sam' });
  assert.deepEqual(p('Acheter un jeu'), { title: 'Acheter un jeu' });
});
test('récurrence : chaque mardi', () =>
  assert.deepEqual(p('Sortir les poubelles chaque mardi'), {
    title: 'Sortir les poubelles', recurrence: { freq: 'weekly', interval: 1, weekdays: [2] }, dueDate: '2026-09-29',
  }));
test('récurrence : tous les mardis et vendredis', () => {
  const r = p('Poubelles tous les mardis et vendredis');
  assert.deepEqual(r.recurrence, { freq: 'weekly', interval: 1, weekdays: [2, 5] });
  assert.equal(r.dueDate, TODAY); // vendredi = aujourd'hui
  assert.equal(r.title, 'Poubelles');
});
test('récurrence : liste avec virgules', () =>
  assert.deepEqual(p('Sport tous les lundis, mercredis et vendredis').recurrence, { freq: 'weekly', interval: 1, weekdays: [1, 3, 5] }));
test('récurrence : tous les mois le 5', () =>
  assert.deepEqual(p('Payer le loyer tous les mois le 5 !haute #admin'), {
    title: 'Payer le loyer', recurrence: { freq: 'monthly', interval: 1, monthDay: 5 }, dueDate: '2026-10-05', priority: 1, categoryId: 'admin',
  }));
test('récurrence : intervalles', () => {
  assert.deepEqual(p('Arroser tous les 3 jours').recurrence, { freq: 'daily', interval: 3 });
  assert.equal(p('Arroser tous les 3 jours').dueDate, TODAY);
  assert.deepEqual(p('Draps toutes les 2 semaines').recurrence, { freq: 'weekly', interval: 2, weekdays: [5] });
  assert.deepEqual(p('Chaudière chaque année').recurrence, { freq: 'yearly', interval: 1, month: 9, monthDay: 25 });
});
test('récurrence : jours de semaine', () =>
  assert.deepEqual(p('Vitamines chaque jour de semaine').recurrence, { freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }));
test('récurrence + date de départ', () => assert.equal(p('Cours de piano chaque mardi 15/10').dueDate, '2026-10-20'));
test('focus', () => assert.deepEqual(p('Appeler le notaire * !haute'), { title: 'Appeler le notaire', focus: true, priority: 1 }));
test("« les » ordinaire n'est pas une récurrence", () => assert.deepEqual(p('Sortir les poubelles'), { title: 'Sortir les poubelles' }));
