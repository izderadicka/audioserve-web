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
import { buildResponse, cloneRequest, evictCache } from "./util/sw";
import { APP_COMMIT, isDevelopment, ENVIRONMENT} from "./util/version";

function broadcastMessage(msg: CacheMessage) {
    self.clients.matchAll().then((clients) => {
        for (const c of clients) {
            console.debug(`Sending ${msg} to client ${c.type}::${c.id}`);
            c.postMessage(msg);

        }
    })
}

const staticResources = [
  "/",
  "/index.html",
  "/global.css",
  "/favicon.png",
  "/bundle.css",
  "/bundle.js",
  "/app.webmanifest",
];

const cacheName = "static-"+APP_COMMIT;
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
  evictCache(cache, AUDIO_CACHE_LIMIT, (req) => broadcastMessage({
    kind: CacheMessageKind.Deleted,
    data: {
      cachedUrl: req.url,
      originalUrl: req.url
    }
  }))

}



const runningLoads: Map<string, AbortController> = new Map();

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
          originalUrl: msg.data.url
        }
      });
      return
    } else {
      abort = new AbortController();
      runningLoads.set(keyUrl, abort);
    }

    evt.waitUntil(
    fetch(msg.data.url, {
      credentials: "include",
      cache: "no-cache",
      signal: abort.signal,
    }).then(async (resp) => {
      if (resp.ok) {
        runningLoads
        const cache = await self.caches.open(audioCache);
        await cache.put(keyUrl, resp);
        notifyAudioCached(cache, {
          kind: CacheMessageKind.PrefetchCached,
          data: {
           cachedUrl: keyUrl,
           originalUrl: resp.url, 
          }
        });
        console.debug(
          `SW PREFETCH RESPONSE: ${resp.status} saving as ${keyUrl}`
        );
      } else {
        console.error(`Cannot cache audio ${resp.url}: STATUS ${resp.status}`);
        broadcastMessage({
          kind: CacheMessageKind.PrefetchError,
          data: {
            cachedUrl: keyUrl,
            originalUrl: resp.url,
            error: new Error(`Response status error code: ${resp.status}`)
          }
        })
      }
    })
    .catch((err) => broadcastMessage({
      kind: CacheMessageKind.PrefetchError,
      data: {
        cachedUrl: keyUrl,
        originalUrl: msg.data.url,
        error: err
      }
    }))
    .then(() => runningLoads.delete(keyUrl))
    );
  }
});

self.addEventListener("push", (evt) => {
  console.log("Got push message", evt.data.text());
});

self.addEventListener("fetch", (evt: FetchEvent) => {
  const parsedUrl = new URL(evt.request.url);
  if (/^\/\d+\/audio\//.test(parsedUrl.pathname)) {
    console.log("AUDIO FILE request: ", decodeURI(parsedUrl.pathname));
    // we are not intercepting requests with seek query
    if (parsedUrl.searchParams.get("seek")) return;

    const rangeHeader = evt.request.headers.get("range");
    evt.respondWith(
      caches.open(audioCache).then((cache) =>
        cache.match(evt.request).then((resp) => {
          if (resp) {
            console.debug(`SERVING CACHED AUDIO: ${resp.url}`);
            return buildResponse(resp, rangeHeader);
          } else {
            // let remove range header so we can cache
            const req =cloneRequest(evt.request);
            req.headers.delete("Range");
            return fetch(req)
            .then((resp) => { // if not cached we can put it 
              const keyReq = removeQuery(evt.request.url);
              cache.put(keyReq, resp.clone()).then(() => notifyAudioCached(cache, {
                kind: CacheMessageKind.ActualCached,
                data: {
                  originalUrl: resp.url,
                  cachedUrl: keyReq
                }
              })
              )
              return resp;
            });
          }
        })
      )
      .catch((err) => {
        console.error("SW Error", err);
        return new Response("Service Worker Cache Error", {status: 555})
      }
    ) 
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
