export function advanceAmount(value: number, limit: number) {
  if (!Number.isFinite(limit) || limit < 100000) return 0;
  const maximum = Math.floor(limit / 10000) * 10000;
  const amount = Number.isFinite(value) ? Math.floor(value / 10000) * 10000 : 100000;
  return Math.min(maximum, Math.max(100000, amount));
}
