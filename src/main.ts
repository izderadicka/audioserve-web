import App from "./App.svelte";
import type { Cache } from "./cache";
import { CacheStorageCache } from "./cache/cs-cache";
import { getLocationPath } from "./util/browser";
import { ShakeDetector } from "./util/movement";
import {
  APP_VERSION,
  ENVIRONMENT,
  APP_COMMIT,
  isDevelopment,
} from "./util/version";

console.log(
  `Running app version ${APP_VERSION}(${APP_COMMIT}) in env ${ENVIRONMENT}`
);

let app: App;

function createApp(cache: Cache) {
  app = new App({
    target: document.body,
    props: { cache },
  });
}

export default app;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js", { scope: "./", type: "module" })
    .catch((error) => {
      // registration failed
      console.error("Service worker registration failed with " + error, error);
    });

  navigator.serviceWorker.ready.then((reg) => {
    // registration worked
    //console.log("After registration", reg.installing, reg.waiting, reg.active);
    const ctl = reg.active;
    console.log("Service Worker registration succeeded. Scope is " + reg.scope, ctl);

    if (ctl) {
      ctl.onstatechange = reportWorkerStatus;
      const cache = new CacheStorageCache(ctl, getLocationPath());
      // has to watch for changes of ServiceWorker controller
      navigator.serviceWorker.oncontrollerchange = () => {
        if (navigator.serviceWorker.controller) {
          console.log(
            `Service worker changed, state is ${navigator.serviceWorker.controller.state}`
          );
          navigator.serviceWorker.controller.onstatechange = reportWorkerStatus;
          cache.updateWorker(navigator.serviceWorker.controller);
        } else {
          console.error("No active Service Worker");
        }
      };
      createApp(cache);
    } else {
      console.error("Controller is not ready!!!");
    }

    // navigator.serviceWorker.addEventListener("message", (evt: MessageEvent) => {
    //   console.log("CLIENT: Got message", evt.data, evt.source);
    //   navigator.serviceWorker.controller.postMessage({
    //     txt: "Reply from client, got " + JSON.stringify(evt.data),
    //   });
    // });
  });
} else {
  console.error(
    "Service worker is not available - will start with no caching"
  );
  createApp(null);
}

function reportWorkerStatus() {
  if (navigator.serviceWorker?.controller) {
    console.log("Service worker state changed to "+ navigator.serviceWorker.controller.state);
  } else {
    console.error("Service worker is not available");
  }
}

if ("storage" in navigator) {
  navigator.storage
    .estimate()
    .then((estimate) => console.debug("Available storage:", estimate));
}
