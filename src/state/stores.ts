import { writable, derived, readable } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import { defaultConfig } from "../app-config";
import { CollectionsApi, Configuration, PositionsApi } from "../client";
import type { CollectionsInfo, Transcoding, TranscodingsInfo } from "../client";
import { PlaybackSync } from "../client-position/playback-sync";
import {
  StorageKeys,
  TranscodingCode,
  transcodingCodeToName,
} from "../types/enums";
import type { PlayItem } from "../types/play-item";
import type {
  AppConfig,
  CurrentFolder,
  CurrentFolderProperties,
  CurrentPlayList,
  TranscodingDetail,
} from "../types/types";
import { isDevelopment } from "../util/version";
import { get, set } from "idb-keyval";
import { API_CACHE_AGE_KEY } from "../types/constants";
import { getContext } from "svelte";
import { CacheMessageKind } from "../cache/cs-cache";
import { PositionExtraApi } from "../client-position/extra-api";

export const isAuthenticated = writable(true);
export const apiConfig = writable(new Configuration());
export const group = writable(localStorage.getItem(StorageKeys.GROUP));
export const collections: Writable<CollectionsInfo | undefined> = writable();
export const selectedCollection: Writable<number | undefined> = writable();

export const transcodings: Writable<TranscodingsInfo> = writable();
const initialTranscoding =
  localStorage.getItem(StorageKeys.TRANSCODING) || TranscodingCode.Medium;
export const selectedTranscoding: Writable<TranscodingCode> = writable(
  initialTranscoding as TranscodingCode
);
export const selectedTranscodingDetails: Readable<TranscodingDetail> = derived(
  [transcodings, selectedTranscoding],
  ([$transcodings, $selectedTranscoding]) => {
    const code = $selectedTranscoding;
    const key = transcodingCodeToName(code).toLocaleLowerCase();
    if ($transcodings && key in $transcodings) {
      const info: Transcoding = $transcodings[key];
      return {
        code,
        bitrate: info.bitrate,
        name: info.name,
      };
    } else {
      return {
        code,
        bitrate: 0,
      };
    }
  }
);
export const currentFolder: Writable<CurrentFolder | undefined> =
  writable(undefined);

export const currentFolderProperties: Writable<CurrentFolderProperties> =
  writable({ hasFiles: false, isFinished: false });

export const playItem: Writable<PlayItem> = writable(undefined);
export const playList: Writable<CurrentPlayList> = writable(undefined);
export const pendingDownloads: Writable<number> = writable(0);

export const colApi = derived(
  apiConfig,
  ($apiConfig) => new CollectionsApi($apiConfig)
);

export const positionsApi = derived(
  [apiConfig, group],
  ([$apiConfig, $group]) => {
    if (!group) return null;
    const api = new PositionsApi($apiConfig);
    // this is a hack - as api is generated and is missing some endpoints
    const apiExtra = new PositionExtraApi($apiConfig, $group);
    (api as any).extra = apiExtra;
    return api;
  }
);

const getInitialConfig = () => {
  const pref = localStorage.getItem(StorageKeys.PREFERENCES);
  let conf = defaultConfig;
  if (pref) {
    try {
      const prefObj = JSON.parse(pref);
      conf = Object.assign(conf, prefObj);
    } catch (e) {
      console.error("Invalid preferences");
    }
  }

  return conf;
};

export const config: Writable<AppConfig> = writable(getInitialConfig());

config.subscribe(async (config) => {
  const currentApiCacheAge = await get(API_CACHE_AGE_KEY);
  if (currentApiCacheAge !== config.apiCacheAge) {
    await set(API_CACHE_AGE_KEY, config.apiCacheAge);
    const worker = navigator.serviceWorker?.controller;
    worker?.postMessage({
      kind: CacheMessageKind.UpdateConfig,
      data: {},
    });

  }
})

export const positionWsApi: Readable<PlaybackSync> = derived(
  [config, apiConfig, group],
  ([$config, $apiConfig, $group], set) => {

    const newSyncer = new PlaybackSync({
      development: isDevelopment,
      developmentPort: 3000,
      positionReportingPeriod: $config.positionReportingPeriod,
      group: $group,
    });
    set(newSyncer);
    return () => newSyncer.finalize();
  }
);
function getWindowSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export const windowSize = readable(getWindowSize(), (set) => {
  window.addEventListener("resize", () => set(getWindowSize()));
});

export const sleepTime = writable(0);
