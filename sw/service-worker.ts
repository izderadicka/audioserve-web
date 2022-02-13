// @ts-ignore
declare var self: ServiceWorkerGlobalScope;
export default undefined;


function broadcastMessage(msg?: string) {
    self.clients.matchAll().then((clients) => {
        console.log(`Got (${msg}) ${clients.length} clients`);
        
        for (const c of clients) {
            console.log(`Sending ${msg} to client ` + JSON.stringify(c));
            c.postMessage({txt: "Here is your worker"});
            
        }
    })
}

const DEVELOPMENT=true
const staticResources = [
    '/',
    '/index.html',
    '/global.css',
    '/favicon.png',
    '/build/bundle.css',
    '/build/bundle.js'
]

const cacheName = "static-v1";

self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(cacheName).then((cache) => {
          return cache.addAll(DEVELOPMENT?['/favicon.png',]:staticResources);
        }).then(() => console.log("Installation successful"))
      );
    
})

self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keyList) => {
          return Promise.all(keyList.map((key) => {
            if (key.startsWith('static-') && key != cacheName) {
              return caches.delete(key);
            }
          })).then(() => console.log("Activation successful") );
        })
      );
    
   
})

self.addEventListener('message', (evt: MessageEvent) => {
    console.log("Got message", evt.data, evt.source);
    broadcastMessage("as reply");
})

self.addEventListener('push', (evt) => {
    console.log("Got push message", evt.data.text());
})

self.addEventListener('fetch', (evt: FetchEvent) => {
    
    evt.respondWith(
        caches.match(evt.request).then((response) => {
          console.log(`FETCH: ${evt.request.url}`, evt.request, response);
          const rangeHeader = evt.request.headers.get('range');
          if (rangeHeader) {
            console.log("RANGE: ", rangeHeader);
          }
          return response || fetch(evt.request);
        })
      );
})

