import { api } from '../api';

/** Swaps `id` with its neighbour in `list` and saves the new order. */
export async function moveAndSave(endpoint, list, id, direction) {
  const index = list.findIndex((x) => x.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= list.length) return null;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  await api.put(`${endpoint}/reorder`, { ids: next.map((x) => x.id) });
  return next.map((x, order) => ({ ...x, order }));
}
