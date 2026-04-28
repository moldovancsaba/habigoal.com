export function toJsonId<T extends { _id?: unknown }>(record: T) {
  return {
    ...record,
    _id: record._id?.toString()
  };
}
