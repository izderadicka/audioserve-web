import { StorageKeys } from "../types/enums";

export function otherTheme() {
    const currentTheme = localStorage.getItem(StorageKeys.THEME) || "light";
    return currentTheme === "light"?"dark":"light";
}

export function capitalize(s:string) {
    if (s.length == 0) return "";
    return s[0].toUpperCase() + s.slice(1);
}

