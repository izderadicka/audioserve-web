import type { AppConfig } from "./types/types";

export const defaultConfig: AppConfig = {
    maxParallelDownload: 1,
    cacheAheadFiles: 3,
    transcodingTolerance: 0.15,
    positionReportingPeriod: 10,
    sleepTimerPeriod: 2,
  };