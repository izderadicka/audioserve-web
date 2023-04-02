import { StorageKeys } from "../types/enums";
import type { AppConfig } from "../types/types";

export function saveConfig(config: AppConfig) {
  localStorage.setItem(StorageKeys.PREFERENCES, JSON.stringify(config));
}

export function otherTheme() {
  const currentTheme = localStorage.getItem(StorageKeys.THEME) || "light";
  return currentTheme === "light" ? "dark" : "light";
}

export function getLocationPath(): string {
  let path = location.pathname;
  path = path.replace(/index.html$/, "");
  return path.replace(/\/+$/, "");
}

export function baseUrl(dev: boolean) {
  let url: string;
  if (dev) {
    url = "http://localhost:3000";
  } else {
    url = `${location.protocol}//${location.host}`;
  }
  const path = getLocationPath();
  if (path) url += path;

  return url;
}

function mapWsProtocol(p: string) {
  if (p == "http:") {
    return "ws:";
  } else if (p == "https:") {
    return "wss:";
  }
}

export function baseWsUrl(dev: boolean, port: number): string {
  let baseUrl = dev
    ? `${mapWsProtocol(window.location.protocol)}//${
        window.location.hostname
      }:${port}`
    : `${mapWsProtocol(window.location.protocol)}//${window.location.host}`;

  const path = getLocationPath();
  if (path) {
    baseUrl += path;
  }

  return baseUrl;
}

export function slideAction(node) {
  let x;
  let y;

  function handleMousedown(event) {
    if (event.type.startsWith("touch")) {
      x = event.touches[0].pageX;
      y = event.touches[0].pageY;
    } else {
      // react only on main button
      if (event.button !== 0) {
        return;
      }
      x = event.clientX;
      y = event.clientY;
    }

    node.dispatchEvent(
      new CustomEvent("slidestart", {
        detail: { x, y },
      })
    );

    window.addEventListener("mousemove", handleMousemove);
    window.addEventListener("touchmove", handleMousemove);
    window.addEventListener("mouseup", handleMouseup);
    window.addEventListener("touchend", handleMouseup);
  }

  function handleMousemove(event) {
    let clientX = x;
    let clientY = y;

    if (event.type.startsWith("touch")) {
      clientX = event.touches[0].pageX;
      clientY = event.touches[0].pageY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    const dx = clientX - x;
    const dy = clientY - y;

    node.dispatchEvent(
      new CustomEvent("slidemove", {
        detail: { dx, dy },
      })
    );
  }

  function handleMouseup(event) {
    x = 0;
    y = 0;

    node.dispatchEvent(new CustomEvent("slideend"));

    window.removeEventListener("mousemove", handleMousemove);
    window.removeEventListener("touchmove", handleMousemove);
    window.removeEventListener("mouseup", handleMouseup);
    window.removeEventListener("touchend", handleMouseup);
  }

  node.addEventListener("mousedown", handleMousedown);
  node.addEventListener("touchstart", handleMousedown, { passive: true });

  return {
    destroy() {
      node.removeEventListener("mousedown", handleMousedown);
      node.removeEventListener("touchstart", handleMousedown);
    },
  };
}
