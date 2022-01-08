export function createCache() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("audio-cache");
    req.onerror = reject;
    req.onsuccess = (ev: any) => {
      const db: IDBDatabase = ev.target.result;

      resolve(new DbCache(db));
    };
    req.onupgradeneeded = (evt: any) => {
      const db: IDBDatabase = evt.target.result;
      if (!db.objectStoreNames.contains("audio-files")) {
        const os = db.createObjectStore("audio-files", { keyPath: "url" });
        os.transaction.oncomplete = (ev) => {
          console.log("Created object store audio-files");
        };
      }
    };
  });
}

export class DbCache {
  constructor(private db: IDBDatabase) {}
}
