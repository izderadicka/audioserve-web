import App from "./App.svelte";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./service-worker.js", { scope: "./" })
    .catch((error) => {
      // registration failed
      console.log("Registration failed with " + error);
    });

  navigator.serviceWorker.ready.then((reg) => {
    // registration worked
    //console.log("After registration", reg.installing, reg.waiting, reg.active);
    const ctl = reg.active;
    console.log("Registration succeeded. Scope is " + reg.scope, ctl);

    if (ctl) {
      ctl.postMessage({ txt: "Hu Ha from client" });
    } else {
      console.error("Controller is not ready!!!");
    }

    navigator.serviceWorker.addEventListener("message", (evt: MessageEvent) => {
      console.log("CLIENT: Got message", evt.data, evt.source);
      //   navigator.serviceWorker.controller.postMessage({
      //     txt: "Reply from client, got " + JSON.stringify(evt.data),
      //   });
    });

    //
  });
}

if ("storage" in navigator) {
  navigator.storage
    .estimate()
    .then((estimate) => console.log("Available storage:", estimate));
}

const app = new App({
  target: document.body,
  props: {},
});

export default app;
