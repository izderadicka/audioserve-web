import { writable, derived, Writable, Readable, readable } from "svelte/store";
import { defaultConfig } from "../app-config";
import type { CachedItem } from "../cache";
import {
  CollectionsApi,
  CollectionsInfo,
  Configuration,
  Transcoding,
  TranscodingsInfo,
} from "../client";
import { PlaybackSync } from "../client-position/playback-sync";
import {
  StorageKeys,
  TranscodingCode,
  transcodingCodeToName,
  transcodingNameToCode,
} from "../types/enums";
import type { PlayItem } from "../types/play-item";
import type {
  AppConfig,
  CurrentFolder,
  CurrentPlayList,
  TranscodingDetail,
} from "../types/types";
import { isDevelopment } from "../util/version";

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

export const playItem: Writable<PlayItem> = writable(undefined);
export const playList: Writable<CurrentPlayList> = writable(undefined);
export const pendingDownloads: Writable<number> = writable(0);

export const colApi = derived(
  apiConfig,
  ($apiConfig) => new CollectionsApi($apiConfig)
);

export const config: Writable<AppConfig> = writable(defaultConfig);

export const positionWsApi: Readable<PlaybackSync> = derived(
  [config, apiConfig, group],
  ([$config, $apiConfig, $group]) => {
    return new PlaybackSync({
      development: isDevelopment,
      developmentPort: 3000,
      positionReportingPeriod: $config.positionReportingPeriod,
      group: $group,
    });
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
