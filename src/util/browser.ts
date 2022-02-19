import { StorageKeys } from "../types/enums";

export function otherTheme() {
    const currentTheme = localStorage.getItem(StorageKeys.THEME) || "light";
    return currentTheme === "light" ? "dark" : "light";
  }