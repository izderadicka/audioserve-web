var CacheMessageKind;
(function (CacheMessageKind) {
    CacheMessageKind[CacheMessageKind["Prefetch"] = 1] = "Prefetch";
})(CacheMessageKind || (CacheMessageKind = {}));

/// <reference no-default-lib="true"/>
var undefined$1 = undefined;
const cacheName = "static-v1";
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
    }
});
self.addEventListener("push", (evt) => {
    console.log("Got push message", evt.data.text());
});
self.addEventListener("fetch", (evt) => {
    const parsedUrl = new URL(evt.request.url);
    if (/^\/\d+\/audio\//.test(parsedUrl.pathname)) {
        console.log("AUDIO FILE request: ", decodeURI(parsedUrl.pathname));
        const rangeHeader = evt.request.headers.get("range");
        if (rangeHeader) {
            console.log("RANGE: ", rangeHeader);
        }
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
