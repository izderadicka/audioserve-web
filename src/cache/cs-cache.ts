import type { Cache } from ".";
import { EventType } from ".";
import { removeQuery, splitPath } from "../util";
import type { CachedItem, CacheEventHandler, PrefetchRequest } from "./types";

export const AUDIO_CACHE_NAME = "audio";
export const AUDIO_CACHE_LIMIT = 1000;

export enum CacheMessageKind {
  Prefetch = 1,
  AbortLoads = 2,
  PrefetchCached = 10,
  ActualCached = 11,
  Skipped = 12, // As is already being loaded
  Deleted = 20,
  PrefetchError = 30,
  ActualError = 31,
  OtherError = 39
}

export interface CacheMessage {
  kind: CacheMessageKind;
  data: any;
}

export class CacheStorageCache implements Cache {
  private queue: string[] = [];
  private processing = 0;
  private listeners: CacheEventHandler[] = [];
  private worker: ServiceWorker;

  constructor(worker: ServiceWorker) {
    this.updateWorker(worker);
    /// @ts-ignore
    navigator.serviceWorker.addEventListener("message", (evt) =>
      this.processMessageEvent(evt)
    );
  }

  updateWorker(w: ServiceWorker) {
    this.worker = w;
  }

  private processMessageEvent(evt: MessageEvent) {
    const msg: CacheMessage = evt.data;
    if (
      msg.kind === CacheMessageKind.PrefetchCached ||
      msg.kind === CacheMessageKind.ActualCached
    ) {
      this.notifyListeners(EventType.FileCached, msg.data);
      // delete any pending prefetch from queue
      this.queue = this.queue.filter( (item) => !item.startsWith(msg.data.cachedUrl));
    } else if (msg.kind === CacheMessageKind.Deleted) {
      this.notifyListeners(EventType.FileDeleted, msg.data)
    } else if (msg.kind === CacheMessageKind.Skipped) {
      console.debug(`Prefetch of  ${msg.data.originalUrl} skipped as is already being loaded`);
    } else {
      console.error("Cache error message", msg);
    }

    // Process next queued prefetch
    if (
      msg.kind === CacheMessageKind.PrefetchCached ||
      msg.kind === CacheMessageKind.PrefetchError ||
      msg.kind === CacheMessageKind.Skipped
    ) {
      this.processing = this.processing>0?this.processing-1:0;
      this.processQueue();
    }
  }

  getCachedUrl(url: string): Promise<CachedItem> {
    return caches.open(AUDIO_CACHE_NAME).then((cache) => {
      const cachedUrl = removeQuery(url);
      return cache.match(cachedUrl).then((item) => {
        if (item) {
          return {
            cachedUrl: cachedUrl,
            originalUrl: item.url,
          };
        } else {
          return null;
        }
      });
    });
  }
  getCachedPaths(collection: number, folder: string): Promise<string[]> {
    const collLen = collection.toString().length;
    return caches
      .open(AUDIO_CACHE_NAME)
      .then((cache) => cache.keys())
      .then((keys) => {
        return keys
          .map((req) => {
            const parsedURL = new URL(req.url);
            return decodeURI(parsedURL.pathname);
          })
          .filter((path) => {
            const prefix = `/${collection}/audio/${folder}`;
            const { folder: dir } = splitPath(path);
            return prefix === dir;
          })
          .map((path) => path.substring(collLen + 8));
      });
  }

  cacheAhead(...urls: PrefetchRequest[]) {
    console.debug(`Want to prefetch ${urls.length} files : ${urls.map((i) => JSON.stringify(i)).join(', ')}`);
    this.queue = []
    for (const urlObject of urls) {
      let  url:string;
      if (typeof urlObject === "string") {
        url = urlObject
      } else {
        url = urlObject.url;
      }
      this.queue.push(url);
      if (this.processing < this.maxParallelLoads) {
        this.processQueue();
      }
    }
  }

  private processQueue(): void {
    const url = this.queue.shift();
    if (url) {
      this.worker.postMessage({
        kind: CacheMessageKind.Prefetch,
        data: { url },
      });
      this.processing += 1;
    }
  }

  cancelPendingLoads(pathPrefix: string, includingRunning?: boolean): void {
    if (!pathPrefix) {
      this.queue = [];
    } else {
      this.queue = this.queue.filter((url) => {
        const path  = new URL(url).pathname;
        return !path.startsWith(pathPrefix);
      })
    }

    if (includingRunning) {
      this.worker.postMessage({
        kind: CacheMessageKind.AbortLoads,
        data: {pathPrefix}
      })
    }
  }


  addListener(l: CacheEventHandler) {
    this.listeners.push(l);
  }
  removeListener(l: CacheEventHandler) {
    const idx = this.listeners.findIndex((item) => item === l);
    if (idx >= 0) {
      this.listeners.splice(idx, 1);
    }
  }

  private notifyListeners(kind: EventType, item: CachedItem): void {
    this.listeners.forEach((l) =>
        l({
          kind,
          item
        })
      );

  }

  maxParallelLoads: number = 1;

  clearCache(): Promise<void> {
    return caches.delete(AUDIO_CACHE_NAME).then(() => {});
  }
}
