import { z } from 'zod';
import { recurrenceRuleSchema, type RecurrenceRule } from './recurrence';

// Schémas partagés : validation côté serveur, typage côté front.

export const isoDate = z.iso.date(); // "YYYY-MM-DD"

export const PRIORITIES = { HIGH: 1, NORMAL: 2, LOW: 3 } as const;
/** Nombre maximum de tâches épinglées dans le focus du jour. */
export const FOCUS_MAX = 3;
export const prioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type Priority = z.infer<typeof prioritySchema>;

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est vide').max(500),
  notes: z.string().max(20_000).nullish(),
  categoryId: z.uuid().nullish(),
  priority: prioritySchema.default(2),
  dueDate: isoDate.nullish(),
  recurrence: recurrenceRuleSchema.nullish(), // l'échéance est alors calée sur la règle
  focus: z.boolean().optional(),
});
export type TaskCreateInput = z.input<typeof taskCreateSchema>;

export const taskUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    notes: z.string().max(20_000).nullable(),
    categoryId: z.uuid().nullable(),
    priority: prioritySchema,
    dueDate: isoDate.nullable(),
    completed: z.boolean(), // true => completedAt = maintenant
    focus: z.boolean(),     // true => focusDate = aujourd'hui
  })
  .partial()
  .strict();
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export const setRecurrenceSchema = z.object({ rule: recurrenceRuleSchema.nullable() });

export const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const taskViewSchema = z.enum(['today', 'week', 'later', 'all']);
export type TaskView = z.infer<typeof taskViewSchema>;

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string | null;
  priority: Priority;
  dueDate: string | null;
  position: number;
  focusDate: string | null;
  recurrenceId: string | null;
  recurrence: RecurrenceRule | null; // règle jointe par l'API, pour l'affichage
  completedAt: string | null; // horodatage ISO (UTC)
  createdAt: string;
  updatedAt: string;
}

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide');

const categoryFields = {
  name: z.string().trim().min(1, 'Le nom est vide').max(40),
  emoji: z.string().trim().max(8),
  color: hexColor,
};

export const categoryCreateSchema = z.object({
  name: categoryFields.name,
  emoji: categoryFields.emoji.default(''),
  color: categoryFields.color.default('#687082'),
});
export type CategoryCreateInput = z.input<typeof categoryCreateSchema>;

// Pas de .partial() sur le schéma de création : Zod 4 y réappliquerait les valeurs par défaut.
export const categoryUpdateSchema = z.object(categoryFields).partial().strict();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  position: number;
}

// ---------- Courses ----------
export const shoppingAddSchema = z.object({ name: z.string().trim().min(1, "L'article est vide").max(120) });
export const shoppingUpdateSchema = z
  .object({ name: z.string().trim().min(1).max(120), checked: z.boolean() })
  .partial()
  .strict();
export const shoppingClearSchema = z.object({ ids: z.array(z.string()).min(1) });
export type ShoppingUpdateInput = z.infer<typeof shoppingUpdateSchema>;

export interface ShoppingItem {
  id: string;
  name: string;
  key: string;
  checked: boolean;
  position: number;
  createdAt: string;
  checkedAt: string | null;
}
export interface ShoppingHistoryEntry {
  key: string;
  label: string;
  useCount: number;
  lastUsed: string;
}

// ---------- Notes ----------
export const noteSaveSchema = z.object({ content: z.string().max(200_000) });
export interface Note {
  content: string;
  updatedAt: string | null;
}
