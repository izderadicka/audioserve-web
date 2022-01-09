import { get } from "svelte/store";
import type { AudioFile } from "../client";
import { apiConfig, selectedCollection } from "../state/stores";
import { StorageKeys } from "../types/enums";

export function otherTheme() {
  const currentTheme = localStorage.getItem(StorageKeys.THEME) || "light";
  return currentTheme === "light" ? "dark" : "light";
}

export function capitalize(s: string) {
  if (s.length == 0) return "";
  return s[0].toUpperCase() + s.slice(1);
}

export function formatTime(dur: number) {
  if (!isFinite(dur)) return "?";
  let hours = 0;
  let mins: number | string = Math.floor(dur / 60);
  let secs: number | string = Math.floor(dur % 60);
  secs = ("0" + secs).slice(-2);
  if (mins >= 60) {
    hours = Math.floor(mins / 60);
    mins = mins - hours * 60;
    mins = ("0" + mins).slice(-2);
  }
  if (hours) {
    return `${hours}:${mins}:${secs}`;
  } else {
    return `${mins}:${secs}`;
  }
}

export function audioFileUrl(file: AudioFile, collection?:number) {
  const basePath = get(apiConfig).basePath;
  const col = collection ?? get(selectedCollection);
  const url = basePath + "/" + col + "/audio/" + encodeURI(file.path);
  return url;
}

export function splitUrl(url: string) {
    const parsedUrl = new URL(url);
    const path = decodeURI(parsedUrl.pathname);
    const comps = path.split('/')
    return {
        collection: parseInt(comps[1]),
        path: comps.slice(3).join('/')
    }
}
