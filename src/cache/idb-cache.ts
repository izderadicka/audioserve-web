import { Cache, CacheEventHandler, EventType } from ".";
import { audioFilePath, splitPath, splitUrl } from "../util";
import type { CachedItem } from "./types";

const CACHE_DB = "audio-cache";
const AUDIO_FILES_STORE = "audio-files";
const FOLDER_INDEX = "folder";

export function createCache(): Promise<Cache> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CACHE_DB);
    req.onerror = reject;
    req.onsuccess = (ev: any) => {
      const db: IDBDatabase = ev.target.result;

      resolve(new DbCache(db));
    };
    req.onupgradeneeded = (evt: any) => {
      const db: IDBDatabase = evt.target.result;
      if (!db.objectStoreNames.contains(AUDIO_FILES_STORE)) {
        const os = db.createObjectStore(AUDIO_FILES_STORE, { keyPath: "path" });
        os.createIndex(FOLDER_INDEX, "folder", {unique: false});
        os.transaction.oncomplete = (ev) => {
          console.log("Created object store audio-files");
        };
      }
    };
  });
}

class StoredItem {
  public folder:string;
  constructor(
    public info: CachedItem,
    public blob: Blob,
    public path: string,
    public timestamp: Date
  ) {
    this.folder= splitPath(path).folder!;
  }
}

class QueueItem {
  constructor(
    public request: Request,
    public resolve: (item: CachedItem) => void,
    public reject: (error: Error) => void
  ) {}
}

class RunningItem {
  constructor(
    public request: Request,
    public abort: AbortController
  ) {}
}

export class DbCache implements Cache {
  private listeners: CacheEventHandler[] = [];
  private queue: QueueItem[] = [];
  private running: RunningItem[] = [];
  maxParallelLoads: number;

  constructor(private db: IDBDatabase) {
    this.maxParallelLoads = 2;
  }

  private  storeRecord(record: StoredItem): Promise<void> {
    return new Promise((resolve, reject) => {
    const transaction = this.db.transaction([AUDIO_FILES_STORE], "readwrite");
    transaction.objectStore(AUDIO_FILES_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);

    });

  }

  private getRecord(url: string) : Promise<StoredItem|null> {
    return new Promise((resolve,reject) => {
      const path = new URL(url).pathname;
      const transaction = this.db.transaction(AUDIO_FILES_STORE);
      const req = transaction.objectStore(AUDIO_FILES_STORE).get(path);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error)
    })
  }

  private getAllForFolder(folder: string) : Promise<StoredItem[]> {
    
    return new Promise((resolve, reject) => {
      const result = [];
      const transaction = this.db.transaction(AUDIO_FILES_STORE);
      const req = transaction.objectStore(AUDIO_FILES_STORE).index(FOLDER_INDEX).openCursor(folder);

      req.onsuccess = (evt: any) => {
        const cursor = evt.target.result;
        if (cursor) {
          result.push(cursor.value);
          cursor.continue();
        } else {
          resolve(result)
        }

      }
      req.onerror = () => reject(req.error);
    })
  }

  private async fetchNext() {
    if (this.running.length < this.maxParallelLoads) {
      const req = this.queue.shift();
      if (!req) return;
      const abort = new AbortController();
      this.running.push(new RunningItem(req.request,abort));
      try {
        const resp = await fetch(req.request, { signal: abort.signal });
        if (resp.status === 200) {
          const body = await resp.blob();
          const item: CachedItem = {
            originalUrl: req.request.url,
            cachedUrl: URL.createObjectURL(body)
          };
          const parsedURL = new URL(req.request.url)
          const record: StoredItem = new StoredItem(item, body, parsedURL.pathname,new Date());
          await this.storeRecord(record);
          req.resolve(item);
        } else {
          const error = new Error(`Request for ${req.request.url} returned error status ${resp.status}`)
          req.reject(error);
        }
      } catch (err) {
        req.reject(err);
      }
      const idx = this.running.findIndex((i) => i.request === req.request);
      if (idx>=0) {
        this.running.splice(idx,1);
      } else {
        console.error("Request is missing in running queue, something is wrong!");
        
      }
      this.fetchNext();
    }
  }
   getCachedUrl(url: string): Promise<CachedItem|null> {
     return this.getRecord(url)
     .then((rec) => {
        if (rec) {
          const item = rec.info;
          item.cachedUrl = URL.createObjectURL(rec.blob);
          return item
        } else {
          return null;
        }
     })
   
  }

  getCachedPaths(collection: number, folder: string): Promise<string[]> {
    const fullPath = audioFilePath(collection, folder);
    return this.getAllForFolder(fullPath).then((list) => {
      return list.map((i) => {
        return splitUrl(i.info.originalUrl).path
      })
    })
  }



  cacheAhead(url: string): Promise<CachedItem> {
    console.log(`Want to precache ${url}`, this);
    const request = new Request(url, { credentials: "include" });
    return new Promise((resolve, reject) => {
      this.queue.push(new QueueItem(request, resolve, reject));
      this.fetchNext();
    }).then((cachedItem:CachedItem)=> {
      this.listeners.forEach((l) => l({kind: EventType.FileCached, item: cachedItem}))
      return cachedItem
    });
  }

  cancelPendingLoad(url: string): boolean {
    throw new Error("Method not implemented.");
  }

  addListener(l: CacheEventHandler) {
    this.listeners.push(l);

  }
  removeListener(l: CacheEventHandler) {
    const idx = this.listeners.findIndex((item) => item === l);
    if (idx >= 0) {
      this.listeners.splice(idx,1);
    }


  }
}
