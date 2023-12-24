/// <reference no-default-lib="true"/>
/// <reference lib="es6" />
/// <reference lib="webworker" />

import { removeQuery } from ".";
import { CacheMessageKind } from "../cache/cs-cache";
import type { CacheMessage } from "../cache/cs-cache";

function parseRange(range: string): [number, number?] {
  const r = /^bytes=(\d+)-?(\d+)?/.exec(range)!;
  return [Number(r[1]), r[2] ? Number(r[2]) : undefined];
}
export async function buildResponse(
  originalResponse: Response,
  range?: string | null
): Promise<Response> {
  if (range) {
    const body = await originalResponse.blob();
    const size = body.size;
    const [start, end] = parseRange(range);

    return new Response(body.slice(start, end ? end + 1 : undefined), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end ? end : size - 1}/${size}`,
        "Content-Type": originalResponse.headers.get("Content-Type") as string,
      },
    });
  } else {
    return originalResponse;
  }
}

export async function evictCache(
  cache: Cache,
  sizeLimit: number,
  onDelete: (req: Request) => Promise<any>
): Promise<void> {
  const keys = await cache.keys();
  const toDelete = keys.length - sizeLimit;
  if (toDelete > 0) {
    const deleteList = keys.slice(0, toDelete);
    for (const key of deleteList.reverse()) {
      if (await cache.delete(key)) {
        if (onDelete) await onDelete(key);
      }
    }
  }
}

export function cloneRequest(req: Request): Request {
  return new Request(req.url, {
    credentials: "include",
  });
}

export function logFetchError(e: any, url: string) {
  if (e instanceof DOMException && e.name == "AbortError") {
    console.debug(`Caching of ${url} was aborted`);
  } else {
    console.error(`Error caching of ${url}: ${e}`, e);
  }
}

class FetchQueueItem {
  constructor(
    public url: string,
    public abort: AbortController,
    public isDirect?: boolean,
    public folderPosition?: number
  ) { }
}

export class AudioCache {
  private queue: FetchQueueItem[] = [];

  constructor(
    private audioCache: string,
    private sizeLimit: number,
    private broadcastMessage: (msg: any) => Promise<any>
  ) { }

  getQueue() {
    return this.queue.map((item) => item.url);
  }

  has(url: string) {
    return this.queue.findIndex((i) => i.url === url) >= 0;
  }

  add(
    url: string,
    abort: AbortController,
    isDirect?: boolean,
    folderPosition?: number
  ) {
    // abort all previous direct request
    if (isDirect)
      this.queue.forEach((i) => {
        if (i.isDirect) i.abort.abort();
      });
    this.queue.push(new FetchQueueItem(url, abort, isDirect, folderPosition));
  }

  delete(url: string) {
    const idx = this.queue.findIndex((i) => i.url === url);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
    }
  }

  abort(pathPrefix: string, keepDirect?: boolean) {
    for (const i of this.queue) {
      if (
        !(keepDirect && i.isDirect) &&
        (!pathPrefix || new URL(i.url).pathname.startsWith(pathPrefix))
      ) {
        console.debug(`Aborting ${JSON.stringify(i)}`);
        i.abort.abort();
        // Firefox seems not to generate error when aborting request, so delete it if it was not deleted due to error
        setTimeout(() => {
          this.delete(i.url);
        }, 1000);
      }
    }
  }

  handleRequest(evt: FetchEvent) {
    const rangeHeader = evt.request.headers.get("range");
    evt.respondWith(
      caches
        .open(this.audioCache)
        .then((cache) =>
          cache.match(evt.request).then((resp) => {
            if (resp) {
              console.debug(`Serving cached audio file: ${resp.url}`);
              return buildResponse(resp, rangeHeader);
            } else {
              const keyReq = removeQuery(evt.request.url);
              if (this.has(keyReq)) {
                console.debug(
                  `Not caching direct request ${keyReq} as it is already in progress elsewhere`
                );
                return fetch(evt.request);
              } else {
                const req = cloneRequest(evt.request);
                const abort = new AbortController();

                this.add(keyReq, abort, true);
                req.headers.delete("Range"); // let remove range header so we can cache whole file
                return fetch(req, { signal: abort.signal }).then((resp) => {
                  // if not cached we can put it
                  if (resp.status === 200) {
                    const keyReq = removeQuery(evt.request.url);
                    evt.waitUntil(
                      cache
                        .put(keyReq, resp.clone())
                        .then(async () => {
                          await this.broadcastMessage({
                            kind: CacheMessageKind.ActualCached,
                            data: {
                              originalUrl: resp.url,
                              cachedUrl: keyReq,
                            },
                          });
                          await evictCache(cache, this.sizeLimit, (req) => {
                            return this.broadcastMessage({
                              kind: CacheMessageKind.Deleted,
                              data: {
                                cachedUrl: req.url,
                                originalUrl: req.url,
                              },
                            });
                          });
                        })
                        .catch((e) => logFetchError(e, keyReq))
                        .then(() => this.delete(keyReq))
                    );
                  } else {
                    console.error(
                      "Audio fetch return non-success status " + resp.status
                    );
                    this.delete(keyReq);
                  }
                  return resp;
                });
              }
            }
          })
        )
        .catch((err) => {
          console.error("Service worker Error", err);
          return new Response("Service Worker Cache Error", { status: 555 });
        })
    );
  }

  handlePrefetch(evt: ExtendableMessageEvent) {
    const msg: CacheMessage = evt.data;
    console.debug("Service worker: Prefetch request", msg.data.url);
    const keyUrl = removeQuery(msg.data.url);
    let abort: AbortController;

    if (this.has(keyUrl)) {
      evt.waitUntil(
        this.broadcastMessage({
          kind: CacheMessageKind.Skipped,
          data: {
            cachedUrl: keyUrl,
            originalUrl: msg.data.url,
          },
        })
      );
      return;
    }

    abort = new AbortController();
    this.add(keyUrl, abort, false, msg.data.folderPosition);
    evt.waitUntil(
      fetch(msg.data.url, {
        credentials: "include",
        cache: "no-cache",
        signal: abort.signal,
      })
        .then(async (resp) => {
          if (resp.ok) {
            const cache = await self.caches.open(this.audioCache);
            await cache.put(keyUrl, resp);
            await this.broadcastMessage({
              kind: CacheMessageKind.PrefetchCached,
              data: {
                cachedUrl: keyUrl,
                originalUrl: resp.url,
              },
            });
            await evictCache(cache, this.sizeLimit, (req) => {
              return this.broadcastMessage({
                kind: CacheMessageKind.Deleted,
                data: {
                  cachedUrl: req.url,
                  originalUrl: req.url,
                },
              });
            });
            console.debug(
              `Service worker: Prefetch response ${resp.status} saving as ${keyUrl}`
            );
          } else {
            console.error(
              `Cannot cache audio ${resp.url}: status ${resp.status}`
            );
            await this.broadcastMessage({
              kind: CacheMessageKind.PrefetchError,
              data: {
                cachedUrl: keyUrl,
                originalUrl: resp.url,
                error: new Error(`Response status error code: ${resp.status}`),
              },
            });
          }
        })
        .catch((err) =>
          this.broadcastMessage({
            kind: CacheMessageKind.PrefetchError,
            data: {
              cachedUrl: keyUrl,
              originalUrl: msg.data.url,
              error: err,
            },
          })
        )
        .then(() => this.delete(keyUrl))
    );
  }
}

class CacheBase {
  protected isEnabled = true;

  constructor(protected cacheName: string, protected sizeLimit = 1000) { }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

export class NetworkFirstCache extends CacheBase {
  constructor(cacheName: string, sizeLimit = 1000) {
    super(cacheName, sizeLimit);
  }

  async handleRequest(evt: FetchEvent) {
    if (!this.isEnabled) return;
    evt.respondWith(
      fetch(evt.request)
        .then((response) => {
          if (response.status !== 200) {
            console.error(
              `Server returned status ${response.status} for ${evt.request.url}`
            );
            throw response;
          }
          return caches.open(this.cacheName).then((cache) => {
            cache.put(evt.request, response.clone()).then(() => {
              return evictCache(cache, this.sizeLimit, (req) => {
                console.debug(
                  `Deleted ${req.url} from cache ${this.cacheName}`
                );
                return Promise.resolve();
              });
            });
            return response;
          });
        })
        .catch((e: any) => {
          // For 401, 404 errors we must not use cache!!!
          if (e instanceof Response && [401, 404].indexOf(e.status) >= 0) {
            // delete it from cache
            caches.open(this.cacheName).then((c) => c.delete(evt.request));
            return e;
          }
          const errorResponse = () => {
            if (e instanceof Response) {
              return e;
            } else {
              return new Response("NetworkFirst Cache Error: " + e, {
                status: 555,
              });
            }
          };
          return caches
            .open(this.cacheName)
            .then((cache) => {
              return cache.match(evt.request);
            })
            .then((resp) => {
              if (resp) {
                console.debug("Returning cached response");
                return resp;
              } else {
                return errorResponse();
              }
            })
            .catch(() => {
              return errorResponse();
            });
        })
    );
  }
}

export class CacheFirstCache extends CacheBase {
  age: number = 60;
  constructor(cacheName: string, sizeLimit = 1000, age: number = 60) {
    super(cacheName, sizeLimit);
    this.age = age;
  }

  async fetchAndCache(cache: Cache, request: Request): Promise<Response> {

    let directResponse: Response = null;
    try {
      directResponse = await fetch(request);
    } catch (e) {
      console.error("SW Fetch error", e);
      throw e;
    }

    if (directResponse && directResponse.status === 200) {
      const clonedResponse = directResponse.clone();
      const newHeaders = new Headers(clonedResponse.headers);
      newHeaders.set('x-cached-time', new Date().toUTCString());
      const toCache = new Response(clonedResponse.body, { headers: newHeaders });
      // const toCache = directResponse.clone();
      // toCache.headers.set("X-Cache-Date", new Date().toUTCString());
      cache.put(request, toCache).then(() => {
        return evictCache(cache, this.sizeLimit, (req) => {
          console.debug(
            `Deleted ${req.url} from cache ${this.cacheName}`
          );
          return Promise.resolve();
        })
      })
      return directResponse;
    } else if (directResponse) {
      const status = directResponse.status;
      console.error(`SW Fetch HTTP error ${status}`, directResponse);
      // delete previous cached response if status is serious error
      if (!([429, 500, 502, 503, 504].indexOf(status) >= 0)) {
        cache.delete(request);
      }
      throw directResponse;
    }

  }

  checkStaled(cachedResponse: Response): boolean {

    let cacheIsStaled = true;
    if (cachedResponse) {
      const responseDate = cachedResponse.headers.get("date");
      const cacheDate = cachedResponse.headers.get("x-cached-time");
      if (cacheDate) {
        const headerDate = cacheDate ? new Date(cacheDate) : null;
        const responseAge = headerDate ? (Date.now() - headerDate.getTime()) / 1000 : Number.POSITIVE_INFINITY;
        if (responseAge <= this.age) {
          cacheIsStaled = false;
          console.debug(`Returning cached response with date ${responseDate}, cached date ${cacheDate} and age ${responseAge}`);
        }
      }
    }

    return cacheIsStaled;

  }

  async handleRequest(evt: FetchEvent) {
    if (!this.isEnabled) return;
    evt.respondWith(
      caches.open(this.cacheName).then(async (cache) => {
        const cachedResponse = await cache.match(evt.request);
        let cacheIsStaled = this.checkStaled(cachedResponse);
        let directResponsePromise = this.fetchAndCache(cache, evt.request);

        if (cachedResponse && !cacheIsStaled) {
          directResponsePromise.then((response) => {
            console.debug(`Also caching fresh response ${response.url}`);
          }).catch((e) => {
            console.error("SW Fetch for cache only error", e);
          });
          return cachedResponse;
        } else {
          try {
            return await directResponsePromise;
          } catch (e) {
            if (cachedResponse) {
              console.warn(`Returning stale cached response ${cachedResponse.url}`);
              return cachedResponse;
            }
            else if (e instanceof Response) {
              return e;
            } else {
              console.error(`For ${evt.request.url} cannot get meaningful response returning 555 error`);
              return new Response("CacheFirst Cache Error", {
                status: 555,
              });
            }
          }

        }
      })

    );
  }
}
