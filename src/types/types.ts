import type { AudioFile } from "../client";
import type { FolderType, TranscodingCode } from "./enums";

export interface AudioFileExt extends AudioFile {
  cached?: boolean;
}

export interface CurrentFolder {
  value: string;
  type: FolderType;
}

export interface CurrentPlayList {
  files: AudioFileExt[];
  collection: number;
  folder: string;
  totalTime: number;
}

export interface AppConfig {
  maxParallelDownload: number;
  cacheAheadFiles: number;
  transcodingTolerance: number;
  positionReportingPeriod: number;
  sleepTimerPeriod: number;
  sleepTimerExtend: number;
}

export interface TranscodingDetail {
  code: TranscodingCode;
  bitrate: number;
  name?: string;
}
