import { get } from "svelte/store";
import { apiConfig, selectedCollection } from "../state/stores";
import type { AudioFileExt } from "./types";

export interface PlayItemParams {
  file: AudioFileExt;
  position: number;
  collection?: number;
  startPlay?: boolean;
  time?: number;
}

export class PlayItem {
  url: string;
  duration: number;
  name: string;
  path: string;
  position: number;
  startPlay: boolean;
  cached: boolean;
  time?: number;
  transcoded: boolean;

  constructor(params: PlayItemParams) {
   this.url = PlayItem.constructURL(params.file, params.collection);
    this.duration = params.file.meta?.duration;
    this.name = params.file.name;
    this.path= params.file.path;
    this.cached =  params.file.cached;
    this.position = params.position;
    this.startPlay = params.startPlay
    this.time = params.time

  }

static constructURL(file: AudioFileExt, collection?: number) {
    const basePath = get(apiConfig).basePath;
    const col = collection ?? get(selectedCollection);
    const url = basePath + "/" + col + "/audio/" + encodeURI(file.path);
    return url;
  }
}
