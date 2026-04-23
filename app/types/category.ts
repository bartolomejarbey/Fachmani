export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
};

export type CategoryTree = Category & {
  children: Category[];
};

export function buildTree(flat: Category[]): CategoryTree[] {
  const mains = flat.filter((c) => c.parent_id === null);
  const byParent = new Map<string, Category[]>();
  for (const c of flat) {
    if (c.parent_id) {
      const arr = byParent.get(c.parent_id) ?? [];
      arr.push(c);
      byParent.set(c.parent_id, arr);
    }
  }
  const sortFn = (a: Category, b: Category) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name, "cs");
  return mains
    .slice()
    .sort(sortFn)
    .map((m) => ({
      ...m,
      children: (byParent.get(m.id) ?? []).slice().sort(sortFn),
    }));
}
