import type { AudioFile } from "../client";

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
    files: AudioFile[],
    collection: number,
    folder: string
}