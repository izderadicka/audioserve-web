const AUDIO_CACHE_NAME = "audio";
var CacheMessageKind;
(function (CacheMessageKind) {
    CacheMessageKind[CacheMessageKind["Prefetch"] = 1] = "Prefetch";
})(CacheMessageKind || (CacheMessageKind = {}));

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function parseRange(range) {
    const r = /^bytes=(\d+)-?(\d+)?/.exec(range);
    return [Number(r[1]), r[2] ? Number(r[2]) : undefined];
}
function buildResponse(originalResponse, range) {
    return __awaiter(this, void 0, void 0, function* () {
        if (range) {
            const body = yield originalResponse.blob();
            const size = body.size;
            const [start, end] = parseRange(range);
            return new Response(body.slice(start, end ? end + 1 : undefined), { status: 206,
                headers: {
                    "Content-Range": `bytes ${start}-${end ? end : size - 1}/${size}`,
                    "Content-Type": originalResponse.headers.get("Content-Type")
                }
            });
        }
        else {
            return originalResponse;
        }
    });
}

/// <reference no-default-lib="true"/>
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
            credentials: "include",
            cache: "no-cache",
        }).then((resp) => {
            if (resp.ok) {
                const url = new URL(msg.data.url);
                url.search = "";
                const keyUrl = url.toString();
                return self.caches
                    .open(audioCache)
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
            if (resp) {
                console.debug(`SERVING CACHED AUDIO: ${resp.url}`);
                return buildResponse(resp, rangeHeader);
            }
            else {
                return fetch(evt.request);
            }
        }))
            .catch((err) => {
            console.error("SW Error", err);
            return new Response("Service Worker Cache Error", { status: 555 });
        }));
    }
    else {
        evt.respondWith(caches.open(cacheName).then((cache) => cache.match(evt.request).then((response) => {
            console.log(`OTHER request: ${evt.request.url}`, evt.request, response);
            return response || fetch(evt.request);
        })));
    }
});
//# sourceMappingURL=service-worker.js.map
