import type { Cache } from ".";
import type { CachedItem } from "./types";

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

export class DbCache implements Cache{
  private queue: any[];
  constructor(private db: IDBDatabase) {

    this.maxParallelLoads=2;

  }
    getCachedUrl(url: string): CachedItem {
        throw new Error("Method not implemented.");
    }
    cacheAhead(url: string): Promise<CachedItem> {
        console.log(`Wnat to precache ${url}`)
        return Promise.resolve({
            isCached: true,
            originalUrl: url,
            cachedUrl: url
        });
    }
    cancelPendingLoad(url: string): boolean {
        throw new Error("Method not implemented.");
    }
    maxParallelLoads: number;
}
