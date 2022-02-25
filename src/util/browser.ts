import { StorageKeys } from "../types/enums";

export function otherTheme() {
    const currentTheme = localStorage.getItem(StorageKeys.THEME) || "light";
    return currentTheme === "light" ? "dark" : "light";
  }

export function baseUrl() {
  const url = `${location.protocol}//${location.host}`;
  return url;
}