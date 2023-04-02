import type { AudioFile } from "../client";
import type { FolderType, TranscodingCode } from "./enums";

export interface AudioFileExt extends AudioFile {
  cached?: boolean;
}

export interface CurrentFolder {
  value: string;
  type: FolderType;
  scrollTo?: number;
}

export interface CurrentPlayList {
  files: AudioFileExt[];
  collection: number;
  folder: string;
  totalTime: number;
  hasImage: boolean;
}

export interface AppConfig {
  maxParallelDownload: number;
  cacheAheadFiles: number;
  cacheAheadDelay: number;
  transcodingTolerance: number;
  positionReportingPeriod: number;
  sleepTimerPeriod: number;
  sleepTimerExtend: number;
  jumpForwardTime: number;
  jumpBackTime: number;
  transcodingJumpLimit: number;
  autorewind: boolean;
  recentDays: number;
  alwaysTranscode: string;
  folderIconSize: number;
  showFolderRemainingTime: boolean;
  expandedPlayerTray: boolean;
  enableSlideInBrowser: boolean;
}

export interface TranscodingDetail {
  code: TranscodingCode;
  bitrate: number;
  name?: string;
}
