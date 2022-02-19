import type { Cache } from ".";
import type { CachedItem, CacheEventHandler } from "./types";

export enum CacheMessageKind {
  Prefetch = 1,
}

export interface CacheMessageRequest {
    kind: CacheMessageKind;
    data: any
}

export class CacheStorageCache implements Cache {
  private pendingRequests: Map<string, any>;
  private listeners: CacheEventHandler[] = [];

  constructor(private worker: ServiceWorker) {
      
  }

  updateWorker(w: ServiceWorker) {
      this.worker = w;
  }

  getCachedUrl(url: string): Promise<CachedItem> {
    return Promise.resolve(null);
  }
  getCachedPaths(collection: number, folder: string): Promise<string[]> {
    return Promise.resolve([]);
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
