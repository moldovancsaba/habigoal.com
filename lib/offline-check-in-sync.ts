const DB_NAME = "habigoal-offline";
const STORE = "pending-checkins";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineCheckIn(payload: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ payload, queuedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushOfflineCheckIns(): Promise<{ synced: number; failed: number }> {
  const db = await openDb();
  const items = await new Promise<Array<{ id: number; payload: unknown }>>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as Array<{ id: number; payload: unknown }>);
    req.onerror = () => reject(req.error);
  });

  if (items.length === 0) {
    db.close();
    return { synced: 0, failed: 0 };
  }

  const res = await fetch("/api/check-ins/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessments: items.map((item) => item.payload) }),
  });

  if (!res.ok) {
    db.close();
    return { synced: 0, failed: items.length };
  }

  const body = await res.json();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const item of items) store.delete(item.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return { synced: body.synced ?? items.length, failed: body.errors?.length ?? 0 };
}
