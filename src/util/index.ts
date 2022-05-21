import type { AudioFile } from "../client";
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

export function audioFilePath(collection: number, folder: string) {
  return `/${collection}/audio/${encodeURI(folder)}`;
}

export function splitUrl(url: string, prefix?: string) {
  const parsedUrl = new URL(url);
  let path = decodeURI(parsedUrl.pathname);
  if (prefix) {
    path = path.substring(prefix.length);
  }
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
    return {
      file: path,
    };
  }
}

export function splitRootPath(path: string): { root?: string; path: string } {
  const idx = path.indexOf("/");
  if (idx >= 0) {
    return {
      root: path.substring(0, idx),
      path: path.substring(idx + 1),
    };
  } else {
    return {
      path: path,
    };
  }
}

export function splitExtInName(file: AudioFile): {
  baseName: string;
  extension?: string;
} {
  const idx = file.path.lastIndexOf(".");
  if (idx >= 0) {
    const ext = file.path.substring(idx);
    const baseName = file.name.endsWith(ext)
      ? file.name.substring(0, file.name.length - ext.length)
      : file.name;
    return {
      baseName,
      extension: ext.substring(1),
    };
  } else {
    return {
      baseName: file.name,
    };
  }
}

export function fileToHumanName(file: string) {
  if (/\$\$/.test(file)) {
    const parts = file.split("$$");
    if (parts.length === 3) {
      return parts[0];
    } else if (parts.length == 4) {
      return parts[1];
    }
  }

  const lastDot = file.lastIndexOf(".");
  if (lastDot > 0) {
    return file.substring(0, lastDot);
  } else {
    return file;
  }
}

export function nonEmpty(o: object | Array<any>): boolean {
  if (!o) return false;
  if (o instanceof Array) {
    return o.length > 0;
  } else {
    return Object.keys(o).length > 0;
  }
}

export function sorted<T>(a: Array<T>): Array<T> {
  return [...a].sort();
}
