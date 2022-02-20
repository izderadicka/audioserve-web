const AUDIO_CACHE_NAME = "audio";
var CacheMessageKind;
(function (CacheMessageKind) {
    CacheMessageKind[CacheMessageKind["Prefetch"] = 1] = "Prefetch";
})(CacheMessageKind || (CacheMessageKind = {}));

/// <reference no-default-lib="true"/>
var undefined$1 = undefined;
const cacheName = "static-v1";
const audioCache = AUDIO_CACHE_NAME;
self.addEventListener("install", (evt) => {
    evt.waitUntil(caches
        .open(cacheName)
        .then((cache) => {
        return cache.addAll(["/favicon.png"] );
    })
        .then(() => {
        console.log("SW Installation successful");
        return self.skipWaiting(); // forces to immediately replace old SW
    }));
});
self.addEventListener("activate", (evt) => {
    evt.waitUntil(caches
        .keys()
        .then((keyList) => {
        return Promise.all(keyList.map((key) => {
            if (key.startsWith("static-") && key != cacheName) {
                return caches.delete(key);
            }
        }));
    })
        .then(() => {
        console.log("SW Activation successful");
        return self.clients.claim(); // and forces immediately to take over current page
    }));
});
self.addEventListener("message", (evt) => {
    const msg = evt.data;
    if (msg.kind === CacheMessageKind.Prefetch) {
        console.debug("SW PREFETCH", msg.data.url);
        fetch(msg.data.url, {
            credentials: 'include',
            cache: 'no-cache'
        })
            .then((resp) => {
            if (resp.ok) {
                const url = new URL(msg.data.url);
                url.search = "";
                const keyUrl = url.toString();
                return self.caches.open(audioCache)
                    .then((cache) => {
                    return cache.put(keyUrl, resp);
                })
                    .then(() => console.debug(`SW PREFETCH RESPONSE: ${resp.status} saving as ${keyUrl}`));
            }
            else {
                console.error(`Cannot cache audio ${resp.url}: STTAUS ${resp.status}`);
            }
        });
    }
});
self.addEventListener("push", (evt) => {
    console.log("Got push message", evt.data.text());
});
self.addEventListener("fetch", (evt) => {
    const parsedUrl = new URL(evt.request.url);
    if (/^\/\d+\/audio\//.test(parsedUrl.pathname)) {
        console.log("AUDIO FILE request: ", decodeURI(parsedUrl.pathname));
        // we are not intercepting requests with seek query
        if (parsedUrl.searchParams.get("seek"))
            return;
        const rangeHeader = evt.request.headers.get("range");
        if (rangeHeader) {
            console.log("RANGE: ", rangeHeader);
        }
        evt.respondWith(caches.open(audioCache).then((cache) => cache.match(evt.request).then((resp) => {
            if (resp)
                console.debug(`SERVING CACHED AUDIO: ${resp.url}`);
            return resp || fetch(evt.request);
        })));
    }
    else {
        evt.respondWith(caches.open(cacheName).then((cache) => cache.match(evt.request).then((response) => {
            console.log(`OTHER request: ${evt.request.url}`, evt.request, response);
            return response || fetch(evt.request);
        })));
    }
});

export { undefined$1 as default };
//# sourceMappingURL=service-worker.js.map
