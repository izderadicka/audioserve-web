import type { AudioFile } from "../client";

export interface AudioFileExt extends AudioFile {
    cached?: boolean
}

export interface CurrentPlayItem {
    url: string,
    duration: number,
    name: string,
    path: string,
    position: number,
    startPlay: boolean,
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