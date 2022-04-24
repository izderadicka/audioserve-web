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
  OtherError = 39,
  Ping = 40,
  Pong = 41
}

const MAX_QUEUE_SIZE = 4096;

export interface CacheMessage {
  kind: CacheMessageKind;
  data: any;
}

class QueueItem {
  constructor(
    public url: string,
    public lowPriority: boolean,
    public folderPosition?: number
  ) {}
}

export class CacheStorageCache implements Cache {
  private queue: QueueItem[] = [];
  private queueChangedCB: (n:number)=>void;
  private processing = 0;
  private listeners: CacheEventHandler[] = [];
  private worker: ServiceWorker;
  private poller: number;

  constructor(worker: ServiceWorker, private prefix?: string, maxParallelLoads?: number) {
    this.maxParallelLoads = maxParallelLoads || 1;
    this.updateWorker(worker);
    /// @ts-ignore
    navigator.serviceWorker.addEventListener("message", (evt) =>
      this.processMessageEvent(evt)
    );

    this.poller = setInterval(() => {
      this.worker.postMessage({
        kind: CacheMessageKind.Ping,
        data: {}
      })
    }, 10000) as any;
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
      // delete any pending prefetch from queue if cached by direct load
      const oldSize = this.queue.length;
      this.queue = this.queue.filter(
        (item) => !item.url.startsWith(msg.data.cachedUrl)
      );
      if (oldSize !== this.queue.length) {
        this.updateQueueChanged();
      }
    } else if (msg.kind === CacheMessageKind.Deleted) {
      this.notifyListeners(EventType.FileDeleted, msg.data);
    } else if (msg.kind === CacheMessageKind.Skipped) {
      console.debug(
        `Prefetch of  ${msg.data.originalUrl} skipped as is already being loaded`
      );
    } else if (msg.kind === CacheMessageKind.Pong) {
      console.debug("Got PONG from worker: " + JSON.stringify(msg.data));
    }
    
    else {
      console.error("Cache error message", msg);
    }

    // Process next queued prefetch
    if (
      msg.kind === CacheMessageKind.PrefetchCached ||
      msg.kind === CacheMessageKind.PrefetchError ||
      msg.kind === CacheMessageKind.Skipped
    ) {
      this.processing = this.processing > 0 ? this.processing - 1 : 0;
      this.updateQueueChanged();
      this.processQueue();
    }
  }

  private prefixPath(path: string) {
    return this.prefix?this.prefix+path:path
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
            const prefix = this.prefixPath(`/${collection}/audio/${folder}`);
            const { folder: dir } = splitPath(path);
            return prefix === dir;
          })
          .map((path) => path.substring((this.prefix.length || 0) + collLen + 8));
      });
  }

  cacheAhead(...urls: PrefetchRequest[]) {
    console.debug(
      `Want to prefetch ${urls.length} files : ${urls
        .map((i) => JSON.stringify(i))
        .join(", ")}`
    );
    if (this.queue.length > MAX_QUEUE_SIZE) {
      console.error("Prefecth queue is at max size, cannot add items");
      return;
    }
    const newQueueEnd = this.queue.filter((i) => i.lowPriority === true);
    const newQueueBeginning: QueueItem[] = [];
    for (const urlObject of urls) {
      let url: string;
      let lowPriority: boolean;
      let folderPosition: number;
      if (typeof urlObject === "string") {
        url = urlObject;
        lowPriority = false;
      } else {
        url = urlObject.url;
        lowPriority = urlObject.lowPriority ?? false;
        folderPosition = urlObject.folderPosition;
      }

      (lowPriority ? newQueueEnd : newQueueBeginning).push(
        new QueueItem(url, lowPriority, folderPosition)
      );
    }
    this.queue = newQueueBeginning.concat(newQueueEnd);
    this.updateQueueChanged();
    if (this.processing < this.maxParallelLoads) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    const item = this.queue.shift();
    if (item) {
      this.worker.postMessage({
        kind: CacheMessageKind.Prefetch,
        data: { url: item.url, folderPosition: item.folderPosition },
      });
      this.processing += 1;
    }
  }

  cancelPendingLoads(pathPrefix: string, includingRunning?: boolean, keepDirect?: boolean): void {
    if (!pathPrefix) {
      this.queue = [];
    } else {

      this.queue = this.queue.filter((i) => {
        const path = new URL(i.url).pathname;
        return !path.startsWith(this.prefixPath(pathPrefix));
      });
    }

    if (includingRunning) {
      this.worker.postMessage({
        kind: CacheMessageKind.AbortLoads,
        data: { pathPrefix: this.prefixPath(pathPrefix), keepDirect },
      });
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

  private updateQueueChanged() {
    if (this.queueChangedCB) {
      this.queueChangedCB(this.processing + this.queue.length);
    }
  }
  
  onQueueSizeChanged(callback: (number: any) => void) {
      this.queueChangedCB = callback;
  }
  private notifyListeners(kind: EventType, item: CachedItem): void {
    this.listeners.forEach((l) =>
      l({
        kind,
        item,
      })
    );
  }

  maxParallelLoads: number = 1;

  clearCache(): Promise<void> {
    return caches.delete(AUDIO_CACHE_NAME).then(() => {});
  }
}
