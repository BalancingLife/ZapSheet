export const padTo = <T>(items: T[], length: number, fill: T) =>
  [...items, ...Array(Math.max(0, length - items.length)).fill(fill)].slice(
    0,
    length,
  );
