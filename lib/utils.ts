export function toJsonId<T extends { _id?: unknown }>(record: T) {
  return {
    ...record,
    _id: record._id?.toString()
  };
}

export function formatScore(value: number | null | undefined) {
  return value === null || value === undefined || typeof value !== "number"
    ? "-"
    : value.toFixed(2);
}
