export function arrayMove<T>(items: T[], from: number, to: number) {
  if (from === to) return items;

  const copy = items.slice();
  const [picked] = copy.splice(from, 1);
  copy.splice(to, 0, picked);
  return copy;
}

export const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sheet-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const nextSheetName = (existing: string[]) => {
  let index = 1;
  const names = new Set(existing);
  while (names.has(`Sheet${index}`)) index += 1;
  return `Sheet${index}`;
};
