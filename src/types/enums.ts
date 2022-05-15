export enum StorageKeys {
  LAST_FOLDER = "AUDIOSERVE_LAST_FOLDER",
  LAST_COLLECTION = "AUDIOSERVE_LAST_COLLECTION",
  LAST_FILE = "AUDIOSERVE_LAST_FILE",
  LAST_POSITION = "AUDIOSERVE_LAST_POSITION",
  LAST_PAUSE = "AUDIOSERVE_LAST_PAUSE",
  THEME = "AUDIOSERVE_THEME",
  TRANSCODING = "AUDIOSERVE_TRANSCODING",
  GROUP = "AUDIOSERVE_GROUP",
  PREFERENCES = "AUDIOSERVE_PREFERENCES",
  PLAYBACK_SPEED = "AUDIOSERVE_PLAYBACK_SPEED",
  PLAYBACK_VOLUME = "AUDIOSERVE_PLAYBACK_VOLUME",
}

export enum FolderType {
  REGULAR,
  SEARCH,
  RECENT
}

export enum TranscodingCode {
  Low = "l",
  Medium = "m",
  High = "h",
  None = "0"
}

export type TranscodingName = keyof typeof TranscodingCode;

const reverseTranscoding = new Map<string, TranscodingName>();
Object.keys(TranscodingCode).forEach((k:TranscodingName) => reverseTranscoding.set(TranscodingCode[k], k))

export const transcodingNameToCode = (n: TranscodingName) => TranscodingCode[n];
export const transcodingCodeToName = (c: string) => reverseTranscoding.get(c);
