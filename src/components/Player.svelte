<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Cache, PrefetchRequest } from "../cache";
  import TranscodedIcon from "svelte-material-icons/ArrowCollapseVertical.svelte";
  import CachedIcon from "svelte-material-icons/Cached.svelte";
  import FolderIcon from "svelte-material-icons/FolderOutline.svelte";
  import FileIcon from "svelte-material-icons/FileMusicOutline.svelte";
  import PlayIcon from "svelte-material-icons/Play.svelte";
  import PauseIcon from "svelte-material-icons/Pause.svelte";
  import PreviousIcon from "svelte-material-icons/SkipPrevious.svelte";
  import NextIcon from "svelte-material-icons/SkipNext.svelte";
  import RewindIcon from "svelte-material-icons/Undo.svelte";
  import ForwardIcon from "svelte-material-icons/Redo.svelte";
  import SpeedIcon from "svelte-material-icons/SpeedometerMedium.svelte";

  import {
    apiConfig,
    config,
    currentFolder,
    group,
    playItem,
    playList,
    positionWsApi,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";
  import { PlayItem } from "../types/play-item";

  import { formatTime, splitExt, splitPath, splitRootPath } from "../util";
  import CacheIndicator from "./CacheIndicator.svelte";
  import Play from "svelte-material-icons/Play.svelte";

  const cache: Cache = getContext("cache");
  const fileIconSize = "1.5rem";

  let previousTime: number; // sum of time of previous items
  $: folderTime =
    (isFinite(previousTime) ? previousTime : 0) +
    (isFinite(currentTime) ? currentTime : 0);
  $: formattedFolderTime = formatTime(folderTime);
  let totalFolderTime: number;
  $: formattedTotalFolderTime = formatTime(totalFolderTime);

  let duration: number;
  let expectedDuration: number;
  // TODO: This is WA, as ADTS with aac does not provide correct duration when cached.
  $: if (
    isFinite(duration) &&
    (!mime.startsWith("audio/m4b") || transcoded) &&
    duration > expectedDuration
  ) {
    expectedDuration = duration;
  }
  $: formattedDuration = formatTime(expectedDuration);

  let currentTime: number;
  let reportedTime: number = -1;
  let paused: boolean;
  export const pause = () => {
    paused = true;
  };
  let player: HTMLAudioElement;
  let buffered;
  let seekable;

  let fileDisplayName = "";
  let filePath: string;
  let folder = "";
  let folderPosition = 0;
  let collection: number;
  let transcoded: boolean = false;
  let cached: boolean = false;
  let mime: string;

  $: formattedCurrentTime = formatTime(currentTime);
  $: if (currentTime != undefined) {
    localStorage.setItem(StorageKeys.LAST_POSITION, currentTime.toString());
    if (roundedTime() % 10 === 0) {
      reportPosition();
    }
  }

  $: folderSize = $playList?.files.length || 0;

  function roundedTime() {
    return Math.floor(currentTime);
  }

  function reportPosition(force?: boolean) {
    if (paused && !force) return;
    const time = roundedTime();
    if (time !== reportedTime) {
      const fullPath = `/${collection}/${filePath}`;
      $positionWsApi.enqueuePosition(fullPath, time);
      console.debug(
        `Reporting time ${time}/${currentTime}/${reportedTime} on ${fullPath}`
      );
      reportedTime = time;
    }
  }

  async function startPlay(item: PlayItem): Promise<void> {
    if (item && player) {
      let source;
      if (item.cached) {
        const cachedItem = await cache?.getCachedUrl(item.url);
        if (cachedItem) {
          source = cachedItem.cachedUrl;
          console.debug("Playing cached item", source);
          cached = true;
        } else {
          console.error("Item was removed from cache");
          cached = false;
          source = item.url;
        }
      } else {
        //const url = item.createMediaSourceUrl();
        source = item.url;
        cached = false;
      }
      player.src = source;
      localStorage.setItem(StorageKeys.LAST_FILE, item.path);
      if (item.time != null) {
        currentTime = item.time;
      }
      expectedDuration = item.duration;
      duration = 0;
      reportedTime = -1;
      fileDisplayName = splitExt(item.name).baseName;
      filePath = item.path;
      folderPosition = item.position;
      transcoded = item.transcoded;
      mime = item.mime;
      folder = $playList.folder;
      collection = $playList.collection;
      previousTime = $playList.files
        .slice(0, item.position)
        .reduce((acc, af) => acc + af.meta.duration, 0);
      totalFolderTime = $playList.totalTime;

      if (item.startPlay) {
        player.play();
        reportPosition();
        tryCacheAhead(folderPosition);
      } else {
        paused = true;
      }

      if ("mediaSession" in navigator) {
        const { root: artist, path: album } = splitRootPath(
          splitPath(item.path).folder
        );
        navigator.mediaSession.metadata = new MediaMetadata({
          title: splitExt(item.name).baseName,
          album,
          artist,
          artwork: [{ src: "favicon.png" }],
        });
      }
    }
  }

  const unsubscribe = playItem.subscribe(startPlay);

  function tryCacheAhead(pos: number) {
    if (!cache) return;
    const cacheAheadCount = $config.cacheAheadFiles;
    const preCaches: PrefetchRequest[] = [];
    for (let newPos = pos + 1; newPos <= pos + cacheAheadCount; newPos++) {
      if (newPos < $playList.files.length) {
        const nextFile = $playList.files[newPos];
        if (!nextFile.cached) {
          const item = new PlayItem({
            file: nextFile,
            collection,
            position: newPos,
          });
          // TODO provide also folderPosition
          preCaches.push({
            url: item.url,
            folderPosition: item.position,
            lowPriority: false,
          });
        }
      }
    }
    if (cache && preCaches) {
      cache.cacheAhead(...preCaches);
    }
  }

  function playPause() {
    reportPosition(true);
    if (paused) {
      player.play();
      tryCacheAhead(folderPosition);
    } else {
      player.pause();
    }
  }

  const MEDIA_ERRORS = [
    "MEDIA_ERR_ABORTED",
    "MEDIA_ERR_NETWORK",
    "MEDIA_ERR_DECODE",
    "MEDIA_ERR_SRC_NOT_SUPPORTED",
  ];
  const codeName = (code) => {
    if (code > 0 && code <= MEDIA_ERRORS.length) return MEDIA_ERRORS[code - 1];
    else return `UNKNOWN_${code}`;
  };

  function playerError() {
    const e = player.error;
    console.error("Player error", e);
    const msg = e.message
      ? `${codeName(e.code)} : ${e.message}`
      : codeName(e.code);
    alert("Player Error: " + msg);
  }

  function tryNextFile() {
    let pos = $playItem.position;
    const nextPosition = pos + 1;
    playPosition(nextPosition);
  }

  function playPosition(nextPosition: number, startPlay = true) {
    if (nextPosition >= 0 && nextPosition < $playList.files.length) {
      const nextFile = $playList.files[nextPosition];
      const item = new PlayItem({
        file: nextFile,
        position: nextPosition,
        startPlay,
        collection: $playList.collection,
        time: 0,
      });
      $playItem = item;
    }
  }

  function navigateToFolder() {
    const col = $playList.collection;
    const folder = $playList.folder;
    $selectedCollection = col;
    $currentFolder = { value: folder, type: FolderType.REGULAR };
  }

  function playPrevious() {
    playPosition($playItem.position - 1, !paused);
  }

  function playNext() {
    playPosition($playItem.position + 1, !paused);
  }

  function jumpTime(amt: number) {
    return (evt) => {
      currentTime += amt
    }
  }

  onMount(async () => {
    if ($playItem) {
      await startPlay($playItem);
    }
  });

  onDestroy(unsubscribe);

  const controlSize="40px";
</script>

<div class="info">
  <div id="folder-info">
    <label for="folder-name" class="icon"
      ><FolderIcon size={fileIconSize} /></label
    >
    <span id="folder-name" on:click={navigateToFolder}>{folder}</span>
  </div>
  <div id="total-progress">
    <div class="play-time">{formattedFolderTime}</div>
    <progress value={folderTime} max={totalFolderTime} />
    <div class="total-time">{formattedTotalFolderTime}</div>
  </div>
  <div id="file-info">
    <label for="file-name"
      ><FileIcon size={fileIconSize} />(<span
        >{folderSize ? folderPosition + 1 : 0}</span
      >/<span>{folderSize}</span>)
    </label>

    {#if cached}
      <CachedIcon />
    {:else if transcoded}
      <TranscodedIcon />
    {/if}
    <span id="file-name">{fileDisplayName}</span>
  </div>
</div>
<div class="player">
  <audio
    preload="none"
    crossorigin="use-credentials"
    bind:duration
    bind:currentTime
    bind:paused
    bind:buffered
    bind:seekable
    bind:this={player}
    on:error={playerError}
    on:ended={tryNextFile}
  />
  <div class="play-time">
    {formattedCurrentTime}
  </div>
  <div class="progress">
    <div class="progress-bar">
      <input
        type="range"
        id="playback-progress"
        min="0"
        max={expectedDuration}
        bind:value={currentTime}
      />
      <CacheIndicator ranges={buffered} totalTime={expectedDuration} />
    </div>
  </div>
  <div class="total-time">
    {formattedDuration}
  </div>
</div>
<div class="controls-bar">
<div class="player-controls">
  
  <span class="control-button" on:click={playPrevious}>
    <PreviousIcon size="{controlSize}"/>
  </span>
  <span class="control-button" on:click={jumpTime(-$config.jumpBackTime)}>
    <RewindIcon size="{controlSize}" />
  </span>
  <span class="control-button" on:click={playPause}>
    {#if paused}
      <PlayIcon size="{controlSize}"/>
    {:else}
      <PauseIcon size="{controlSize}"/>
    {/if}
  </span>
  <span class="control-button" on:click={jumpTime($config.jumpForwardTime)}>
    <ForwardIcon size="{controlSize}" />
  </span>
  <span class="control-button" on:click={playNext}>
    <NextIcon size="{controlSize}" />
  </span>

  <!-- <span class="control-button" on:click={null}>
    <SpeedIcon size="{controlSize}" />
  </span> -->
</div>
</div>

<style>

  .player-controls {
   color: var(--primary);
   width: 320px;
   margin-left:  auto ;
   margin-right: auto;
  }

  .player-controls span:not(:first-child) {
    margin-left: 8px
  }

  #total-progress {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  progress {
    height: 3px;
    margin-left: 1rem;
    margin-top: 0.5rem;
  }
  .progress-bar input {
    margin-bottom: 0;
  }

  #prev-file,
  #next-file {
    font-size: 1.5em;
    margin-left: 0.3em;
  }
  #folder-name {
    cursor: pointer;
  }
  
  .progress {
    flex-grow: 1;
    margin-left: 1rem;
    padding-top: 1.2rem;
  }
  .total-time {
    margin-left: 1rem;
    width: 4.5rem;
  }
  .play-time {
    width: 4.5rem;
    text-align: end;
  }
  .player {
    display: flex;
    flex-flow: row;
    align-items: center;
    height: 1.2rem;
    margin-bottom: 1rem;
  }

  button {
    all: initial;
    cursor: pointer;
    color: var(--primary);
  }
  
  label {
    display: inline;
    font-weight: bold;
  }
  .info {
    margin-top: 0.5em;
  }

  @media (max-height: 400px) {
    .info {
      display: none;
    }
  }
</style>
