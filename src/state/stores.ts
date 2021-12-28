import { writable, derived } from "svelte/store";
import { CollectionsApi, Configuration } from "../client";

export const isAuthenticated = writable(true);
export const apiConfig = writable(new Configuration());
export const colApi = derived(apiConfig, ($apiConfig) => new CollectionsApi($apiConfig));