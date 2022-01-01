import { writable, derived, Writable } from "svelte/store";
import { AudioFile, AudioFolder, CollectionsApi, CollectionsInfo, Configuration, TranscodingsInfo } from "../client";
import type { CurrentPlayItem, CurrentPlayList } from "../types/types";

export const isAuthenticated = writable(true);
export const apiConfig = writable(new Configuration());
export const collections: Writable<CollectionsInfo|undefined> = writable();
export const selectedCollection: Writable<number|undefined> = writable();
export const transcodings: Writable<TranscodingsInfo> = writable();
export const selectedTranscoding = writable();
export const currentFolder: Writable<string|undefined> = writable(undefined);

export const playItem: Writable<CurrentPlayItem> = writable(undefined);
export const playList: Writable<CurrentPlayList> = writable(undefined);

export const colApi = derived(apiConfig, ($apiConfig) => new CollectionsApi($apiConfig));