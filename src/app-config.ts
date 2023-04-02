import type { AppConfig } from "./types/types";

export const defaultConfig: AppConfig = {
  maxParallelDownload: 1,
  cacheAheadFiles: 3,
  cacheAheadDelay: 15,
  transcodingTolerance: 0.15,
  positionReportingPeriod: 10,
  sleepTimerPeriod: 30,
  sleepTimerExtend: 15,
  jumpBackTime: 15,
  jumpForwardTime: 10,
  transcodingJumpLimit: 5 * 60,
  autorewind: false,
  recentDays: 365,
  alwaysTranscode: "",
  folderIconSize: 64,
  showFolderRemainingTime: false,
  expandedPlayerTray: false,
  enableSlideInBrowser: false,
};
