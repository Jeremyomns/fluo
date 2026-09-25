import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alignDueDate, describeRule, firstOccurrence, nextAfterCompletion, nextOccurrence, type RecurrenceRule } from './recurrence';

// 2026-09-25 est un vendredi
const tuesdays: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [2] };

test('chaque mardi', () => {
  assert.equal(nextOccurrence(tuesdays, '2026-09-25'), '2026-09-29');
  assert.equal(nextOccurrence(tuesdays, '2026-09-29'), '2026-10-06');
  assert.equal(firstOccurrence(tuesdays, '2026-09-29'), '2026-09-29'); // inclut le jour même
});
test('plusieurs jours par semaine', () => {
  const r: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [2, 5] };
  assert.equal(nextOccurrence(r, '2026-09-25'), '2026-09-29');
  assert.equal(nextOccurrence(r, '2026-09-29'), '2026-10-02');
});
test('toutes les 2 semaines', () => {
  const r: RecurrenceRule = { freq: 'weekly', interval: 2, weekdays: [1] };
  assert.equal(nextOccurrence(r, '2026-09-28'), '2026-10-12');
});
test('tous les 3 jours', () => assert.equal(nextOccurrence({ freq: 'daily', interval: 3 }, '2026-09-25'), '2026-09-28'));
test('chaque mois le 5', () => {
  const r: RecurrenceRule = { freq: 'monthly', interval: 1, monthDay: 5 };
  assert.equal(nextOccurrence(r, '2026-09-25'), '2026-10-05');
  assert.equal(nextOccurrence(r, '2026-10-01'), '2026-10-05');
  assert.equal(nextOccurrence(r, '2026-12-05'), '2027-01-05');
});
test('le 31 : dernier jour des mois courts', () => {
  const r: RecurrenceRule = { freq: 'monthly', interval: 1, monthDay: 31 };
  assert.equal(nextOccurrence(r, '2026-09-25'), '2026-09-30');
  assert.equal(nextOccurrence(r, '2026-09-30'), '2026-10-31');
  assert.equal(nextOccurrence(r, '2027-01-31'), '2027-02-28');
});
test('chaque année', () => {
  const r: RecurrenceRule = { freq: 'yearly', interval: 1, month: 10, monthDay: 12 };
  assert.equal(nextOccurrence(r, '2026-09-25'), '2026-10-12');
  assert.equal(nextOccurrence(r, '2026-10-12'), '2027-10-12');
});
test("occurrence cochée en retard : on repart d'aujourd'hui, sans empiler", () => {
  // poubelles du mardi 15/09 cochées le vendredi 25/09 → mardi 29/09 (pas le 22 déjà passé)
  assert.equal(nextAfterCompletion(tuesdays, '2026-09-15', '2026-09-25'), '2026-09-29');
  // cochée en avance : on part de l'échéance prévue
  assert.equal(nextAfterCompletion(tuesdays, '2026-09-29', '2026-09-25'), '2026-10-06');
});
test("alignement de l'échéance sur la règle", () => {
  assert.equal(alignDueDate(tuesdays, '2026-09-29', '2026-09-25'), '2026-09-29');
  assert.equal(alignDueDate(tuesdays, '2026-09-25', '2026-09-25'), '2026-09-29');
  assert.equal(alignDueDate(tuesdays, null, '2026-09-25'), '2026-09-29');
});
test('descriptions', () => {
  assert.equal(describeRule(tuesdays), 'Chaque mardi');
  assert.equal(describeRule({ freq: 'weekly', interval: 1, weekdays: [5, 1, 3] }), 'Chaque lundi, mercredi et vendredi');
  assert.equal(describeRule({ freq: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5] }), 'Chaque jour de semaine');
  assert.equal(describeRule({ freq: 'weekly', interval: 2, weekdays: [1] }), 'Toutes les 2 semaines, le lundi');
  assert.equal(describeRule({ freq: 'monthly', interval: 1, monthDay: 1 }), 'Chaque mois le 1er');
  assert.equal(describeRule({ freq: 'daily', interval: 3 }), 'Tous les 3 jours');
  assert.equal(describeRule({ freq: 'yearly', interval: 1, month: 10, monthDay: 12 }), 'Chaque année le 12 octobre');
});
