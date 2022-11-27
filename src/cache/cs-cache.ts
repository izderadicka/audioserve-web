import type { Cache } from ".";
import { EventType } from ".";
import { encodePathParameter, removeQuery, splitPath } from "../util";
import type {
  CachedItem,
  CacheEventHandler,
  PrefetchPlaybackPosition,
  PrefetchRequest,
} from "./types";

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
  Pong = 41,
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
  private queueChangedCB: (n: number) => void;
  private processing: QueueItem[] = [];
  private listeners: CacheEventHandler[] = [];
  private worker: ServiceWorker;
  private poller: number = null;
  private emptyPongs = 0;

  constructor(
    worker: ServiceWorker,
    private prefix?: string,
    maxParallelLoads?: number
  ) {
    this.maxParallelLoads = maxParallelLoads || 1;
    this.updateWorker(worker);
    /// @ts-ignore
    navigator.serviceWorker.addEventListener("message", (evt) =>
      this.processMessageEvent(evt)
    );
  }

  private startPoller() {
    if (this.poller == null) {
      this.emptyPongs = 0;
      this.poller = setInterval(() => {
        this.worker.postMessage({
          kind: CacheMessageKind.Ping,
          data: {},
        });
      }, 10000) as any;
    }
  }

  private stopPoller() {
    if (this.poller != null) {
      clearInterval(this.poller);
      this.emptyPongs = 0;
    }
    this.poller = null;
  }

  ensureStarted() {
    this.startPoller();
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
      if (msg.data.pendingAudio.length === 0) {
        if (this.processing.length > 0) {
          console.warn(
            `${this.processing.length} prefetches were not finished, probably service worker was restarted`,
            this.processing
          );
          this.processing = [];
          this.updateQueueChanged();
          this.processQueue();
        }
        this.emptyPongs++;
        if (this.emptyPongs >= 3) {
          this.stopPoller();
        }
      } else {
        this.emptyPongs = 0;
        // Check if urls are still processing
        const toDelete = [];
        for (let i = 0; i < this.processing.length; i++) {
          const keyUrl = removeQuery(this.processing[i].url);
          if (msg.data.pendingAudio.indexOf(keyUrl) < 0) {
            console.warn(
              `Prefetch of ${keyUrl} was not finished in service worker`
            );
            toDelete.push(i);
          }
        }
        if (toDelete.length > 0) {
          for (const idx of toDelete) {
            this.processing.splice(idx, 1);
          }
          this.updateQueueChanged();
          this.processQueue();
        }
      }
    } else if (msg.kind === CacheMessageKind.PrefetchError) {
      if (msg.data.error && msg.data.error.name === "AbortError") {
        console.debug(`Prefetch of ${msg.data.originalUrl} was aborted`);
      } else {
        console.error(`Prefetch error`, msg.data);
      }
    } else {
      console.error("Cache message from service worker error", msg);
    }

    // Process next queued prefetch
    if (
      msg.kind === CacheMessageKind.PrefetchCached ||
      msg.kind === CacheMessageKind.PrefetchError ||
      msg.kind === CacheMessageKind.Skipped
    ) {
      const url = msg.data.originalUrl;
      this.processing = this.processing.filter((i) => i.url !== url);
      this.updateQueueChanged();
      this.processQueue();
    }
  }

  private prefixPath(path: string) {
    return this.prefix ? this.prefix + path : path;
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
            return decodeURIComponent(parsedURL.pathname);
          })
          .filter((path) => {
            const prefix = this.prefixPath(`/${collection}/audio/${folder}`);
            const { folder: dir } = splitPath(path);
            return prefix === dir;
          })
          .map((path) =>
            path.substring((this.prefix.length || 0) + collLen + 8)
          );
      });
  }

  cacheAhead(
    urls: PrefetchRequest[],
    currentlyPlaying?: PrefetchPlaybackPosition
  ) {
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
    const toAbort = new Set<string>();
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

      if (!this.processing.find((i) => i.url === url)) {
        (lowPriority ? newQueueEnd : newQueueBeginning).push(
          new QueueItem(url, lowPriority, folderPosition)
        );
      } else {
        console.debug(`Url ${url} is already being prefetched`);
      }

      if (!lowPriority) {
        //Cancel running loads from other folders
        const myFolder = splitPath(
          decodeURIComponent(new URL(url).pathname)
        ).folder;

        this.processing.forEach((inProgress) => {
          const runningFolder = splitPath(
            decodeURIComponent(new URL(inProgress.url).pathname)
          ).folder;
          if (runningFolder !== myFolder) {
            toAbort.add(encodePathParameter(runningFolder));
          } else if (
            currentlyPlaying.folderPosition &&
            currentlyPlaying.folderPosition > inProgress.folderPosition
          ) {
            toAbort.add(new URL(inProgress.url).pathname);
          }
        });
      }
    }
    this.queue = newQueueBeginning.concat(newQueueEnd);
    this.updateQueueChanged();
    if (this.processing.length < this.maxParallelLoads) {
      this.processQueue();
    }
    toAbort.forEach((f) => {
      this.cancelRunning(f, false); // TODO: check logic is correct for keepRunning
    });
  }

  private processQueue(): void {
    const item = this.queue.shift();
    if (item) {
      this.worker.postMessage({
        kind: CacheMessageKind.Prefetch,
        data: { url: item.url, folderPosition: item.folderPosition },
      });
      this.processing.push(item);
      this.startPoller();
    }
  }

  cancelPendingLoads(
    pathPrefix: string,
    includingRunning?: boolean,
    keepDirect?: boolean
  ): void {
    if (!pathPrefix) {
      this.queue = [];
    } else {
      this.queue = this.queue.filter((i) => {
        const path = new URL(i.url).pathname;
        return !path.startsWith(this.prefixPath(pathPrefix));
      });
    }
    this.updateQueueChanged();
    if (includingRunning) {
      this.cancelRunning(pathPrefix, keepDirect);
    }
  }

  private cancelRunning(pathPrefix: string, keepDirect: boolean) {
    this.worker.postMessage({
      kind: CacheMessageKind.AbortLoads,
      data: { pathPrefix: this.prefixPath(pathPrefix), keepDirect },
    });
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
      this.queueChangedCB(this.processing.length + this.queue.length);
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
