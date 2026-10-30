/** Next active option for a WAI-ARIA combobox; -1 means no active option. */
export function moveActive(current: number, key: "ArrowDown" | "ArrowUp" | "Home" | "End", count: number): number {
  if (count <= 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return current < 0 || current >= count - 1 ? 0 : current + 1;
  return current <= 0 ? count - 1 : current - 1;
}

/** Index Enter should pick: the active option, else the only/first match. */
export function enterIndex(active: number, count: number): number {
  if (count <= 0) return -1;
  return active >= 0 && active < count ? active : 0;
}
