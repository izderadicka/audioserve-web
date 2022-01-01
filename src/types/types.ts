import type { AudioFile } from "../client";

export interface CurrentPlayItem {
    url: string,
    duration: number,
    name: string,
    position: number
}

export interface CurrentPlayList {
    files: AudioFile[],
    collection: number,
    folder: string
}