/// <reference no-default-lib="true"/>
/// <reference lib="es6" />
/// <reference lib="webworker" />
declare var self: ServiceWorkerGlobalScope;

import {
  AUDIO_CACHE_NAME,
  CacheMessageKind,
  CacheMessage,
  AUDIO_CACHE_LIMIT,
} from "./cache/cs-cache";
import { removeQuery } from "./util";
import { buildResponse, cloneRequest, evictCache, FetchQueue, logFetchError } from "./util/sw";
import { APP_COMMIT, isDevelopment, ENVIRONMENT } from "./util/version";

function broadcastMessage(msg: CacheMessage) {
  self.clients.matchAll().then((clients) => {
    for (const c of clients) {
      console.debug(`Sending ${msg} to client ${c.type}::${c.id}`);
      c.postMessage(msg);
    }
  });
}

const staticResources = [
  "/",
  "/index.html",
  "/global.css",
  "/favicon.png",
  "/bundle.css",
  "/bundle.js",
  "/app.webmanifest",
  "/static/will_sleep_soon.mp3",
  "/static/extended.mp3"
];

const cacheName = "static-" + APP_COMMIT;
const audioCache = AUDIO_CACHE_NAME;

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        return cache.addAll(isDevelopment ? ["/favicon.png"] : staticResources);
      })
      .then(() => {
        console.log(`SW Installation successful (dev ${isDevelopment} )`);
        return self.skipWaiting(); // forces to immediately replace old SW
      })
  );
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key.startsWith("static-") && key != cacheName) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log("SW Activation successful");
        return self.clients.claim(); // and forces immediately to take over current page
      })
  );
});

function notifyAudioCached(cache: Cache, msg: CacheMessage) {
  broadcastMessage(msg);
  evictCache(cache, AUDIO_CACHE_LIMIT, (req) =>
    broadcastMessage({
      kind: CacheMessageKind.Deleted,
      data: {
        cachedUrl: req.url,
        originalUrl: req.url,
      },
    })
  );
}

const runningLoads =  new FetchQueue();

self.addEventListener("message", (evt) => {
  const msg: CacheMessage = evt.data;
  if (msg.kind === CacheMessageKind.Prefetch) {
    console.debug("SW PREFETCH", msg.data.url);
    const keyUrl = removeQuery(msg.data.url);
    let abort: AbortController;

    if (runningLoads.has(keyUrl)) {
      broadcastMessage({
        kind: CacheMessageKind.Skipped,
        data: {
          cachedUrl: keyUrl,
          originalUrl: msg.data.url,
        },
      });
      return;
    } else {
      abort = new AbortController();
      runningLoads.add(keyUrl, abort, false, msg.data.folderPosition);
    }

    evt.waitUntil(
      fetch(msg.data.url, {
        credentials: "include",
        cache: "no-cache",
        signal: abort.signal,
      })
        .then(async (resp) => {
          if (resp.ok) {
            const cache = await self.caches.open(audioCache);
            await cache.put(keyUrl, resp);
            notifyAudioCached(cache, {
              kind: CacheMessageKind.PrefetchCached,
              data: {
                cachedUrl: keyUrl,
                originalUrl: resp.url,
              },
            });
            console.debug(
              `SW PREFETCH RESPONSE: ${resp.status} saving as ${keyUrl}`
            );
          } else {
            console.error(
              `Cannot cache audio ${resp.url}: STATUS ${resp.status}`
            );
            broadcastMessage({
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
          broadcastMessage({
            kind: CacheMessageKind.PrefetchError,
            data: {
              cachedUrl: keyUrl,
              originalUrl: msg.data.url,
              error: err,
            },
          })
        )
        .then(() => runningLoads.delete(keyUrl))
    );
  } else if (msg.kind === CacheMessageKind.AbortLoads) {
    runningLoads.abort(msg.data.pathPrefix, msg.data.keepDirect);
  }
});

self.addEventListener("push", (evt) => {
  console.log("Got push message", evt.data.text());
});

self.addEventListener("fetch", (evt: FetchEvent) => {
  const parsedUrl = new URL(evt.request.url);
  if (/^\/\d+\/audio\//.test(parsedUrl.pathname)) {
    console.debug("AUDIO FILE request: ", decodeURI(parsedUrl.pathname));
    // we are not intercepting requests with seek query
    if (parsedUrl.searchParams.get("seek")) return;

    const rangeHeader = evt.request.headers.get("range");
    evt.respondWith(
      caches
        .open(audioCache)
        .then((cache) =>
          cache.match(evt.request).then((resp) => {
            if (resp) {
              console.debug(`SERVING CACHED AUDIO: ${resp.url}`);
              return buildResponse(resp, rangeHeader);
            } else {
              const keyReq = removeQuery(evt.request.url);
              if (runningLoads.has(keyReq)) {
                console.debug(`Not caching direct request ${keyReq} as it is already in progress elsewhere`)
                return fetch(evt.request);
              } else {
                const posHeader = evt.request.headers.get("X-Folder-Position");
                let folderPosition = posHeader?Number(posHeader):undefined;
                if (isNaN(folderPosition)) {
                  folderPosition = undefined;
                }
                const req = cloneRequest(evt.request);
                const abort = new AbortController();

                runningLoads.add(keyReq, abort, true, folderPosition);
                req.headers.delete("Range"); // let remove range header so we can cache whole file
                return fetch(req, {signal: abort.signal}).then((resp) => {
                  // if not cached we can put it
                  const keyReq = removeQuery(evt.request.url);
                  cache.put(keyReq, resp.clone()).then(() =>
                    notifyAudioCached(cache, {
                      kind: CacheMessageKind.ActualCached,
                      data: {
                        originalUrl: resp.url,
                        cachedUrl: keyReq,
                      },
                    })
                  )
                  .catch((e) => logFetchError(e, keyReq))
                  .then(() => runningLoads.delete(keyReq));
                  return resp;
                })
              }
            }
          })
        )
        .catch((err) => {
          console.error("SW Error", err);
          return new Response("Service Worker Cache Error", { status: 555 });
        })
    );
  } else {
    evt.respondWith(
      caches.open(cacheName).then((cache) =>
        cache.match(evt.request).then((response) => {
          console.log(
            `OTHER request: ${evt.request.url}`,
            evt.request,
            response
          );
          return response || fetch(evt.request);
        })
      )
    );
  }
});
