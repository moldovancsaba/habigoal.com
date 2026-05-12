function segments(path: string) {
  return path.split(".").filter(Boolean);
}

function isArrayIndex(segment: string) {
  return /^\d+$/.test(segment);
}

export function getFormValue(source: unknown, path: string): unknown {
  let current: unknown = source;

  for (const segment of segments(path)) {
    if (!current || typeof current !== "object" || !(segment in (current as Record<string, unknown>))) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function setFormValue<T>(source: T, path: string, value: unknown): T {
  const next = structuredClone(source) as Record<string, unknown>;
  const pathSegments = segments(path);

  if (pathSegments.length === 0) {
    return source;
  }

  let current: unknown = next;

  for (const [index, segment] of pathSegments.entries()) {
    const isLast = index === pathSegments.length - 1;
    const nextSegment = pathSegments[index + 1];

    if (Array.isArray(current)) {
      const arrayIndex = Number(segment);

      if (isLast) {
        current[arrayIndex] = value;
        break;
      }

      const existing = current[arrayIndex];
      if (!existing || typeof existing !== "object") {
        current[arrayIndex] = isArrayIndex(nextSegment) ? [] : {};
      }

      current = current[arrayIndex];
      continue;
    }

    const objectValue = current as Record<string, unknown>;

    if (isLast) {
      objectValue[segment] = value;
      break;
    }

    const existing = objectValue[segment];
    if (!existing || typeof existing !== "object") {
      objectValue[segment] = isArrayIndex(nextSegment) ? [] : {};
    }

    current = objectValue[segment];
  }

  return next as T;
}
