import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isoWeekNumber, weekStartISO } from './dates';
import { currentStreak, weekProgress } from './habits';

// 2026-09-25 est un vendredi
const T = '2026-09-25';
const base = { createdAt: '2026-09-01T08:00:00Z' };

test('semaine : lundi et numéro ISO', () => {
  assert.equal(weekStartISO(T), '2026-09-21');
  assert.equal(weekStartISO('2026-09-27'), '2026-09-21'); // dimanche
  assert.equal(isoWeekNumber(T), 39);
  assert.equal(isoWeekNumber('2026-01-01'), 1);
  assert.equal(isoWeekNumber('2027-01-01'), 53); // vendredi 1er janvier 2027 : semaine 53 de 2026
});
test("série : aujourd'hui pas encore fait ne casse rien", () => {
  const h = { ...base, days: [0, 1, 2, 3, 4, 5, 6], logs: ['2026-09-22', '2026-09-23', '2026-09-24'] };
  assert.equal(currentStreak(h, T), 3);
  assert.equal(currentStreak({ ...h, logs: [...h.logs, T] }, T), 4);
});
test('série : un jour prévu manqué la casse', () => {
  const h = { ...base, days: [0, 1, 2, 3, 4, 5, 6], logs: ['2026-09-21', '2026-09-23', '2026-09-24'] };
  assert.equal(currentStreak(h, T), 2);
});
test('série : les jours non prévus sont ignorés', () => {
  // en semaine seulement : vendredi 18, lundi 21 … jeudi 24 → le week-end ne casse pas la série
  const h = { ...base, days: [1, 2, 3, 4, 5], logs: ['2026-09-18', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'] };
  assert.equal(currentStreak(h, T), 5);
});
test('série : ne remonte pas avant la création', () => {
  const h = { createdAt: '2026-09-23T10:00:00Z', days: [0, 1, 2, 3, 4, 5, 6], logs: ['2026-09-23', '2026-09-24'] };
  assert.equal(currentStreak(h, T), 2);
});
test('bilan de la semaine', () => {
  const h = { days: [1, 3, 5], logs: ['2026-09-21', '2026-09-23'] };
  assert.deepEqual(weekProgress(h, '2026-09-21', T), { done: 2, scheduled: 3 });
});
test('bilan : les jours avant la création ne comptent pas', () => {
  const h = { days: [1, 2, 3, 4, 5], logs: [], createdAt: '2026-09-25T09:00:00Z' };
  assert.deepEqual(weekProgress(h, '2026-09-21', T), { done: 0, scheduled: 1 });
});
