<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Cache, PrefetchRequest } from "../cache";
  import TranscodedIcon from "svelte-material-icons/ArrowCollapseVertical.svelte";
  import CachedIcon from "svelte-material-icons/Cached.svelte";
  import AudioIcon from "svelte-material-icons/SineWave.svelte";
  import FolderIcon from "svelte-material-icons/FolderOutline.svelte";
  import PlayIcon from "svelte-material-icons/Play.svelte";
  import PauseIcon from "svelte-material-icons/Pause.svelte";
  import PreviousIcon from "svelte-material-icons/SkipPrevious.svelte";
  import NextIcon from "svelte-material-icons/SkipNext.svelte";
  import RewindIcon from "svelte-material-icons/Undo.svelte";
  import ForwardIcon from "svelte-material-icons/Redo.svelte";
  import SpeedIcon from "svelte-material-icons/SpeedometerMedium.svelte";
  import VolumeIcon from "svelte-material-icons/VolumeHigh.svelte";
  import ExpandIcon from "svelte-material-icons/ChevronUp.svelte";
  import CollapsIcon from "svelte-material-icons/ChevronDown.svelte";

  import {
    config,
    currentFolder,
    playItem,
    playList,
    positionWsApi,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";
  import { PlayItem } from "../types/play-item";

  import {
    formatTime,
    splitExtInName,
    splitPath,
    splitRootPath,
  } from "../util";
  import CacheIndicator from "./CacheIndicator.svelte";
  import { Throttler } from "../util/events";

  const fileIconSize = "1.5rem";
  const controlSize = "48px";
  const MEDIA_ERRORS = [
    "MEDIA_ERR_ABORTED",
    "MEDIA_ERR_NETWORK",
    "MEDIA_ERR_DECODE",
    "MEDIA_ERR_SRC_NOT_SUPPORTED",
  ];

  const codeName = (code: number) => {
    if (code > 0 && code <= MEDIA_ERRORS.length) return MEDIA_ERRORS[code - 1];
    else return `UNKNOWN_${code}`;
  };

  function playerError() {
    progressValueChanging = false;
    const e = player.error;
    console.error("Player error", e);
    const msg = e.message
      ? `${codeName(e.code)} : ${e.message}`
      : codeName(e.code);
    alert("Player Error: " + msg);
  }

  const cache: Cache = getContext("cache");

  let expanded = false;

  let previousTime: number; // sum of time of previous items
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
  $: folderTime =
    (isFinite(previousTime) ? previousTime : 0) +
    (isFinite(currentTime) ? currentTime : 0);
  $: formattedFolderTime = formatTime(folderTime);

  let paused: boolean;
  $: {
    const state = paused == null ? "none" : paused ? "paused" : "playing";
    if (navigator.mediaSession) navigator.mediaSession.playbackState = state;
  }
  export const pause = () => {
    paused = true;
  };

  let player: HTMLAudioElement;
  let buffered;
  let seekable;
  let playbackRate: number = Number(localStorage.getItem(StorageKeys.PLAYBACK_SPEED) || 1.0);

  $: if (player && playbackRate) {
    player.defaultPlaybackRate = playbackRate;
    localStorage.setItem(StorageKeys.PLAYBACK_SPEED, playbackRate.toString());

  }

  let volume: number = Number(localStorage.getItem(StorageKeys.PLAYBACK_VOLUME) || 1.0);

  $: {
    localStorage.setItem(StorageKeys.PLAYBACK_VOLUME, volume.toString());
  }

  let fileDisplayName = "";
  let filePath: string;
  let folder = "";
  let folderPosition = 0;
  let collection: number;
  let transcoded: boolean = false;
  let cached: boolean = false;
  let mime: string;

  let progressValue = 0;
  let progressValueChanging = false;

  const handleProgressMouseUp = () => {
    if (progressValueChanging) {
      window.removeEventListener("mouseup", handleProgressMouseUp);
      window.removeEventListener("touchend", handleProgressMouseUp);
      player.currentTime = progressValue;
      setTimeout(() => {
        progressValueChanging = false;
      }, 200);
    }
  };

  const handleProgressMouseDown = () => {
    progressValueChanging = true;
    window.addEventListener("mouseup", handleProgressMouseUp);
    window.addEventListener("touchend", handleProgressMouseUp);
  };

  $: formattedCurrentTime = formatTime(progressValue);

  const lastPositionThrottler = new Throttler((time: number) => {
    localStorage.setItem(StorageKeys.LAST_POSITION, currentTime.toString());
    reportPosition();
  }, 250);

  $: if (currentTime != undefined) {
    if (!progressValueChanging) {
      progressValue = currentTime;
    }
    updateMediaSessionState();
    lastPositionThrottler.throttle(currentTime);
  }

  function jumpTime(amt: number) {
    return (evt) => {
      player.currentTime += amt;
    };
  }

  $: folderSize = $playList?.files.length || 0;

  function reportPosition(force?: boolean) {
    if (paused && !force) return;
    const fullPath = `/${collection}/${filePath}`;
    $positionWsApi.enqueuePosition(fullPath, currentTime);
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
      fileDisplayName = splitExtInName(item).baseName;
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
        navigator.mediaSession.setPositionState(null);
        const { root: artist, path: album } = splitRootPath(
          splitPath(item.path).folder
        );
        navigator.mediaSession.metadata = new MediaMetadata({
          title: fileDisplayName,
          album,
          artist,
          artwork: [{ src: "favicon.png" }],
        });

        navigator.mediaSession.setActionHandler(
          "seekbackward",
          jumpTime(-$config.jumpBackTime)
        );
        navigator.mediaSession.setActionHandler(
          "seekforward",
          jumpTime($config.jumpForwardTime)
        );
        //navigator.mediaSession.setActionHandler('seekto', function() { /* Code excerpted. */ });
        navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
        navigator.mediaSession.setActionHandler("nexttrack", playNext);
      }
    }
  }

  function updateMediaSessionState() {
    if (
      isFinite(currentTime) &&
      isFinite(duration) &&
      currentTime <= duration
    ) {
      navigator.mediaSession?.setPositionState({
        duration,
        playbackRate: player.playbackRate,
        position: currentTime,
      });
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

  async function playPause() {
    reportPosition(true);
    if (paused) {
      if (!cached) {
        // check if it was loaded meanwhile
        const cachedItem = await cache.getCachedUrl($playItem.url);
        if (cachedItem) {
          console.debug(`Current file ${$playItem.url} gets cached on url ${cachedItem.cachedUrl}`)
          const pos = player.currentTime;
          const oldSrc = player.src;
          player.src = cachedItem.cachedUrl
          cached = true;
          // $playItem.cached = true; 
          progressValueChanging = true;
          player.play()
          player.addEventListener("canplay", (evt)=> {
            progressValueChanging = false
            player.currentTime = pos;
            tryCacheAhead(folderPosition);
          }, 
          {once: true}); 
          return;
        } 
      }
      player.play();
      tryCacheAhead(folderPosition);
    } else {
      player.pause();
    }
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

  onMount(async () => {
    if ($playItem) {
      await startPlay($playItem);
    }
  });

  onDestroy(() => {
    unsubscribe();
    window.removeEventListener("mouseup", handleProgressMouseUp);
    window.removeEventListener("touchend", handleProgressMouseUp);
  });
</script>

<div class="player-separator">
  <div class="player-expand-button" on:click={() => (expanded = !expanded)}>
    {#if expanded}<CollapsIcon  size="48px"/>{:else}<ExpandIcon size="48px" />{/if}
  </div>
</div>

{#if expanded}
  <div class="extra-controls">
    <div class="volume-control slider-control extra-control">
      <span><VolumeIcon  size={fileIconSize}/></span>
      <input
        type="range"
        name="volume"
        id="volume"
        min="0"
        max="1"
        step="0.01"
        bind:value="{volume}"
      />
      <span class="control-value">{volume.toFixed(2)}</span>
    </div>

    <div class="speed-control slider-control extra-control">
      <span><SpeedIcon  size={fileIconSize}/></span>
      <input
        type="range"
        name="playback-speed"
        id="playback-speed"
        min="0.5"
        max="3"
        step="0.1"
        bind:value="{playbackRate}"
      />
      <span class="control-value">{playbackRate.toFixed(1)}</span>
    </div>

  </div>
{/if}

<div class="info">
  <div class="item-info" id="folder-info">
    <label for="folder-name" class="icon"
      ><FolderIcon size={fileIconSize} /></label
    >
    <span
      id="folder-name"
      class="item-name"
      dir="rtl"
      on:click={navigateToFolder}>{folder}</span
    >
  </div>
  <div id="total-progress">
    <div class="play-time">{formattedFolderTime}</div>
    <div class="progress total">
      <progress value={folderTime} max={totalFolderTime} />
    </div>
    <div class="total-time">{formattedTotalFolderTime}</div>
  </div>
  <div class="item-info" id="file-info">
    <label for="file-name">
      {#if cached}
        <CachedIcon size={fileIconSize} />
      {:else if transcoded}
        <TranscodedIcon size={fileIconSize} />
      {:else}
        <AudioIcon size={fileIconSize} />
      {/if}
    </label>
    <span class="label">
      (<span>{folderSize ? folderPosition + 1 : 0}</span>/<span
        >{folderSize}</span
      >)
    </span>
    <span id="file-name" class="item-name">{fileDisplayName}</span>
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
    bind:volume
    bind:playbackRate
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
        bind:value={progressValue}
        on:mousedown={handleProgressMouseDown}
        on:touchstart={handleProgressMouseDown}
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
      <PreviousIcon size={controlSize} />
    </span>
    <span class="control-button" on:click={jumpTime(-$config.jumpBackTime)}>
      <RewindIcon size={controlSize} />
    </span>
    <span class="control-button" on:click={playPause}>
      {#if paused}
        <PlayIcon size={controlSize} />
      {:else}
        <PauseIcon size={controlSize} />
      {/if}
    </span>
    <span class="control-button" on:click={jumpTime($config.jumpForwardTime)}>
      <ForwardIcon size={controlSize} />
    </span>
    <span class="control-button" on:click={playNext}>
      <NextIcon size={controlSize} />
    </span>

    <!-- <span class="control-button" on:click={null}>
    <SpeedIcon size="{controlSize}" />
  </span> -->
  </div>
</div>

<style>
  .extra-controls {
    margin-top: 1rem;
  }

  .extra-control {
    display:flex;
    flex-direction: row;
    gap: 1em;
  }
  .slider-control {
    flex-grow: 1;
  }

  .player-separator {
    background-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0),
      rgba(var(--background-rgb), 1)
    );
    position: relative;
    top: -24px;
    margin-bottom: -24px;
    width: calc(100% - 16px);
  }

  @media (max-width: 400px) {
    .player-separator {
      width: 100%;
    }
  }

  .player-expand-button {
    margin-left: auto;
    margin-right: auto;
    width: 48px;
    height: 25px;
    color: var(--primary);
    position: relative;
    top: -12px;
  }

  div.item-info {
    display: flex;
    flex-direction: row;
    gap: 0.33rem;
  }

  span.item-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .label {
    font-weight: bold;
  }

  .player-controls {
    color: var(--primary);
    max-width: 380px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 0.33rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .player-controls span {
    display: block;
    cursor: pointer;
  }

  #total-progress {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  progress {
    height: 3px;
    margin-top: 0.5rem;
  }
  .progress-bar input {
    margin-bottom: 0;
  }

  #folder-name {
    cursor: pointer;
  }

  .progress {
    flex-grow: 1;
    margin-left: 1rem;
    padding-top: 0.7 rem;
  }

  .progress.total {
    padding-top: 0;
  }
  .total-time {
    margin-left: 1rem;
    width: 4.1rem;
  }
  .play-time {
    width: 4.1rem;
    text-align: end;
  }
  .player {
    display: flex;
    flex-flow: row;
    align-items: center;
    height: 1.2rem;
    margin-bottom: 0.33 rem;
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
    .player-separator {
      display: none;
    }

    .extra-controls {
      display:none;
    }

    div.player {
      margin-top: 1rem;
    }
  }
</style>
