import { get } from "svelte/store";
import { apiConfig, config, selectedCollection, selectedTranscodingDetails } from "../state/stores";
import { TranscodingCode } from "./enums";
import type { AudioFileExt, TranscodingDetail } from "./types";

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
  transcoding?: TranscodingCode;

  constructor(params: PlayItemParams) {
    this.checkNeedsTranscoding(params.file.meta.bitrate)
    this.url = this.constructURL(params.file, params.collection);
    this.duration = params.file.meta?.duration;
    this.name = params.file.name;
    this.path = params.file.path;
    this.cached = params.file.cached;
    this.position = params.position;
    this.startPlay = params.startPlay;
    this.time = params.time;
  }

  private checkNeedsTranscoding(bitrate: number) {
    const currentTranscoding = get(selectedTranscodingDetails);
    const tolerance = get(config).transcodingTolerance;
    if (currentTranscoding.code != TranscodingCode.None && 
            currentTranscoding.bitrate > 0 &&
            bitrate > currentTranscoding.bitrate * (1+tolerance))  {
        this.transcoding = currentTranscoding.code;
        this.transcoded = true;
    }
  }

  private constructURL(file: AudioFileExt, collection?: number) {
    const basePath = get(apiConfig).basePath;
    const col = collection ?? get(selectedCollection);
    let url = basePath + "/" + col + "/audio/" + encodeURI(file.path);
    const query = new URLSearchParams();
    if (this.transcoding) {
        query.append("trans", this.transcoding);
    }
    const queryString = query.toString();
    if (queryString) {
        url += '?' + queryString;
    }
    return url;
  }
}
