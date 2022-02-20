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
import { buildResponse, reduceCache } from "./util/sw";

function broadcastMessage(msg: CacheMessage) {
    self.clients.matchAll().then((clients) => {
        for (const c of clients) {
            console.debug(`Sending ${msg} to client ${c.type}::${c.id}`);
            c.postMessage(msg);

        }
    })
}

const DEVELOPMENT = true;
const staticResources = [
  "/",
  "/index.html",
  "/global.css",
  "/favicon.png",
  "/build/bundle.css",
  "/build/bundle.js",
];

const cacheName = "static-v1";
const audioCache = AUDIO_CACHE_NAME;

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        return cache.addAll(DEVELOPMENT ? ["/favicon.png"] : staticResources);
      })
      .then(() => {
        console.log("SW Installation successful");
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

self.addEventListener("message", (evt) => {
  const msg: CacheMessage = evt.data;
  if (msg.kind === CacheMessageKind.Prefetch) {
    console.debug("SW PREFETCH", msg.data.url);
    fetch(msg.data.url, {
      credentials: "include",
      cache: "no-cache",
    }).then(async (resp) => {
      if (resp.ok) {
        const keyUrl = removeQuery(msg.data.url);
        const cache = await self.caches.open(audioCache);
        await cache.put(keyUrl, resp);
        broadcastMessage({
          kind: CacheMessageKind.Cached,
          data: {
           cachedUrl: keyUrl,
           originalUrl: resp.url, 
          }
        });
        reduceCache(cache, AUDIO_CACHE_LIMIT, (req) => broadcastMessage({
          kind: CacheMessageKind.Deleted,
          data: {
            cachedUrl: req.url,
            originalUrl: req.url
          }
        }))
        console.debug(
          `SW PREFETCH RESPONSE: ${resp.status} saving as ${keyUrl}`
        );
      } else {
        console.error(`Cannot cache audio ${resp.url}: STATUS ${resp.status}`);
      }
    });
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
    if (rangeHeader) {
      console.log("RANGE: ", rangeHeader);
    }

    evt.respondWith(
      caches.open(audioCache).then((cache) =>
        cache.match(evt.request).then((resp) => {
          if (resp) {
            console.debug(`SERVING CACHED AUDIO: ${resp.url}`);
            return buildResponse(resp, rangeHeader);
          } else {
            return fetch(evt.request);
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
