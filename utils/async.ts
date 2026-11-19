export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) return;
        await worker(item);
      }
    }),
  );
}
