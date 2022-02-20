import { StorageKeys } from "../types/enums";

export function capitalize(s: string) {
  if (s.length == 0) return "";
  return s[0].toUpperCase() + s.slice(1);
}

export function removeQuery(url: string): string {
  const parsedUrl = new URL(url);
  parsedUrl.search = "";
  return parsedUrl.toString();
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

export function audioFilePath(collection: number, folder: string) {
  return `/${collection}/audio/${encodeURI(folder)}`;
}

export function splitUrl(url: string) {
  const parsedUrl = new URL(url);
  const path = decodeURI(parsedUrl.pathname);
  const comps = path.split("/");
  return {
    collection: parseInt(comps[1]),
    path: comps.slice(3).join("/"),
  };
}

export function splitPath(path: string): { folder?: string; file: string } {
  const idx = path.lastIndexOf("/");
  if (idx >= 0) {
    return {
      folder: path.substring(0, idx),
      file: path.substring(idx + 1),
    };
  } else {
  }
  return {
    file: path,
  };
}
