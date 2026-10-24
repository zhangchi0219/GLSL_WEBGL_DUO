import type { WorkspaceSnapshot } from "./model";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("glsl-workbench", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地存储。"));
    request.onblocked = () => reject(new Error("本地存储被其他窗口占用，请关闭旧页面后重试。"));
  });
}
export async function readWorkspace(): Promise<WorkspaceSnapshot | null> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("workspace", "readonly").objectStore("workspace").get("current");
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function saveWorkspace(snapshot: WorkspaceSnapshot): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      tx.objectStore("workspace").put(snapshot, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("本地存储空间不足。"));
    });
  } finally { db.close(); }
}
