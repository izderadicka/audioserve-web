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

export function configurableClick(
  node: HTMLElement,
  options: { double: boolean; action: (evt: any) => void }
) {
  let action;
  let evt: string;

  function handler(e) {
    e.preventDefault();
    action(e);
  }

  function update(options: { double: boolean; action: (evt: any) => void }) {
    action = options.action;
    const newEvt = options.double ? "dblclick" : "click";
    if (evt !== newEvt) {
      node.removeEventListener(evt, handler);
      node.addEventListener(newEvt, handler);
      evt = newEvt;
    }
  }

  update(options);

  return {
    update,
    destroy() {
      node.removeEventListener(evt, action);
    },
  };
}
