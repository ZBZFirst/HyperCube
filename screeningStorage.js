const DB_NAME = 'hypercube-screening';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const WORKSPACE_KEY = 'active-workspace';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveWorkspaceSnapshot(snapshot) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
    transaction.objectStore(STORE_NAME).put(snapshot, WORKSPACE_KEY);
  });
}

export async function loadWorkspaceSnapshot() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    transaction.onerror = () => reject(transaction.error);
    const request = transaction.objectStore(STORE_NAME).get(WORKSPACE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function clearWorkspaceSnapshot() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
    transaction.objectStore(STORE_NAME).delete(WORKSPACE_KEY);
  });
}
