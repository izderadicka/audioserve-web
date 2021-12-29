import { writable, derived, Writable } from "svelte/store";
import { CollectionsApi, CollectionsInfo, Configuration, TranscodingsInfo } from "../client";

export const isAuthenticated = writable(true);
export const apiConfig = writable(new Configuration());
export const collections: Writable<CollectionsInfo> = writable();
export const selectedCollection = writable(0);
export const transcodings: Writable<TranscodingsInfo> = writable();
export const selectedTranscoding = writable();
export const colApi = derived(apiConfig, ($apiConfig) => new CollectionsApi($apiConfig));