import type { AudioFile } from "../client";
import type { FolderType } from "./enums";

export interface AudioFileExt extends AudioFile {
    cached?: boolean
}

export interface CurrentFolder {
    value: string,
    type: FolderType
} 

export interface CurrentPlayItem {
    url: string,
    duration: number,
    name: string,
    path: string,
    position: number,
    startPlay: boolean,
    cached: boolean,
    time?: number,
}

export interface CurrentPlayList {
    files: AudioFileExt[],
    collection: number,
    folder: string
}

export interface AppConfig {
    maxParallelDownload: number,
    cacheAheadFiles: number
}