import type { Cache } from ".";
import { EventType } from ".";
import { removeQuery, splitPath } from "../util";
import type { CachedItem, CacheEventHandler } from "./types";

export const AUDIO_CACHE_NAME = "audio";
export const AUDIO_CACHE_LIMIT = 1000;

export enum CacheMessageKind {
  Prefetch = 1,
  Cached = 2,
  Deleted = 3,
}

export interface CacheMessage {
  kind: CacheMessageKind;
  data: any;
}

export class CacheStorageCache implements Cache {
  private pendingRequests: Map<string, any>;
  private listeners: CacheEventHandler[] = [];
  private worker: ServiceWorker;

  constructor(worker: ServiceWorker) {
    this.updateWorker(worker);
    /// @ts-ignore
    navigator.serviceWorker.addEventListener("message", (evt) => {
      const msg: CacheMessage = evt.data;
      if (
        msg.kind === CacheMessageKind.Cached ||
        msg.kind == CacheMessageKind.Deleted
      ) {
        this.listeners.forEach((l) =>
          l({
            kind:
              msg.kind === CacheMessageKind.Cached
                ? EventType.FileCached
                : EventType.FileDeleted,
            item: msg.data,
          })
        );
      } else {
        console.error("Unprocessed cache message", msg);
      }
    });
  }

  updateWorker(w: ServiceWorker) {
    this.worker = w;
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
  cacheAhead(url: string): Promise<CachedItem> {
    console.log(`Want to precache ${url}`);
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        kind: CacheMessageKind.Prefetch,
        data: { url },
      });
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
      this.listeners.splice(idx, 1);
    }
  }
  maxParallelLoads: number = 2;
}
