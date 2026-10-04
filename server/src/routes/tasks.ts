import { reorderSchema, setRecurrenceSchema, taskCreateSchema, taskUpdateSchema, taskViewSchema } from '@fluo/shared';
import { Hono } from 'hono';
import * as svc from '../services/tasks';

const notFound = { error: 'Tâche introuvable' };

export const tasksRoutes = new Hono()
  .get('/', async (c) => {
    const view = taskViewSchema.parse(c.req.query('view') ?? 'today');
    return c.json(await svc.listTasks(view));
  })
  .post('/', async (c) => {
    const input = taskCreateSchema.parse(await c.req.json());
    return c.json(await svc.createTask(input), 201);
  })
  .post('/reorder', async (c) => {
    const { ids } = reorderSchema.parse(await c.req.json());
    await svc.reorderTasks(ids);
    return c.body(null, 204);
  })
  .patch('/:id', async (c) => {
    const patch = taskUpdateSchema.parse(await c.req.json());
    const task = await svc.updateTask(c.req.param('id'), patch);
    return task ? c.json(task) : c.json(notFound, 404);
  })
  .put('/:id/recurrence', async (c) => {
    const { rule } = setRecurrenceSchema.parse(await c.req.json());
    const task = await svc.setRecurrence(c.req.param('id'), rule);
    return task ? c.json(task) : c.json(notFound, 404);
  })
  // ?series=1 : supprime toute la série d'une tâche récurrente (sinon on passe l'occurrence)
  .delete('/:id', async (c) =>
    (await svc.deleteTask(c.req.param('id'), c.req.query('series') === '1')) ? c.body(null, 204) : c.json(notFound, 404),
  );
