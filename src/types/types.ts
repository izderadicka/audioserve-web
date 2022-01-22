import type { AudioFile } from "../client";
import type { FolderType } from "./enums";

export interface AudioFileExt extends AudioFile {
    cached?: boolean
}

export interface CurrentFolder {
    value: string,
    type: FolderType
} 

export interface CurrentPlayList {
    files: AudioFileExt[],
    collection: number,
    folder: string
}

export interface AppConfig {
    maxParallelDownload: number,
    cacheAheadFiles: number,
    transcodingTolerance: number
}