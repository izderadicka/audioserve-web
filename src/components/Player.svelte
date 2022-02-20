<script lang="ts">
  import { getContext, onDestroy } from "svelte";
  import type { Cache } from "../cache";
  import TranscodedIcon from "svelte-material-icons/ArrowCollapseVertical.svelte";
  import CachedIcon from "svelte-material-icons/Cached.svelte";
  import FolderIcon from "svelte-material-icons/FolderOutline.svelte";
  import FileIcon from "svelte-material-icons/FileMusicOutline.svelte";

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

  import { formatTime } from "../util";

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
  $: if (isFinite(duration) && duration > expectedDuration) {
    expectedDuration = duration;
  }
  $: formattedDuration = formatTime(expectedDuration);

  let currentTime: number;
  let reportedTime: number = -1;
  let paused: boolean;
  let player: HTMLAudioElement;

  let file = "";
  let folder = "";
  let folderPosition = 0;
  let collection: number;
  let transcoded: boolean = false;
  let cached: boolean = false;

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
      $positionWsApi.enqueuePosition(`/${collection}/${folder}/${file}`, time);
      console.debug(
        `Reporting time ${time}/${currentTime}/${reportedTime} on ${collection}/${folder}/${file}`
      );
      reportedTime = time;
    }
  }

  const unsubscribe = playItem.subscribe(async (item) => {
    if (item && player) {
      let source;
      if (item.cached) {
        const cachedItem = await cache.getCachedUrl(item.url);
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

      if (item.startPlay) {
        player.play();
        reportPosition();
      } else {
        paused = true;
      }
      file = item.name;
      folderPosition = item.position;
      transcoded = item.transcoded;
      folder = $playList.folder;
      collection = $playList.collection;
      previousTime = $playList.files
        .slice(0, item.position)
        .reduce((acc, af) => acc + af.meta.duration, 0);
      totalFolderTime = $playList.totalTime;

      tryCacheAhead(folderPosition);
    }
  });

  function tryCacheAhead(pos: number) {
    const cacheAheadCount = $config.cacheAheadFiles;
    for (let newPos = pos + 1; newPos <= pos + cacheAheadCount; newPos++) {
      if (newPos < $playList.files.length) {
        const nextFile = $playList.files[newPos];
        if (!nextFile.cached) {
          const item = new PlayItem({
            file: nextFile,
            collection,
            position: newPos,
          });
          cache
            .cacheAhead(item.url);
        }
      }
    }
  }

  function playPause() {
    reportPosition(true);
    if (paused) {
      player.play();
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
    alert("Player Error: "+ msg);
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

  onDestroy(unsubscribe);
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
    <button id="prev-file" on:click={playPrevious}>▲</button>
    <button id="next-file" on:click={playNext}>▼</button>
    {#if cached}
      <CachedIcon />
    {:else if transcoded}
      <TranscodedIcon />
    {/if}
    <span id="file-name">{file}</span>
  </div>
</div>
<div class="player">
  <audio
    preload="none"
    crossorigin="use-credentials"
    bind:duration
    bind:currentTime
    bind:paused
    bind:this={player}
    on:error={playerError}
    on:ended={tryNextFile}
  />
  <div class="play-btn">
    <button on:click={playPause}>
      <svg
        id="play-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="24"
        viewBox="0 0 18 24"
      >
        {#if paused}
          <path fill="#566574" fill-rule="evenodd" d="M18 12L0 24V0" />
        {:else}
          <path
            fill="#566574"
            fill-rule="evenodd"
            d="M0 0h6v24H0zM12 0h6v24h-6z"
          />
        {/if}
      </svg>
    </button>
  </div>
  <div class="play-time">
    {formattedCurrentTime}
  </div>
  <div class="progress">
    <input
      type="range"
      id="playback-progress"
      min="0"
      max={expectedDuration}
      bind:value={currentTime}
    />
  </div>
  <div class="total-time">
    {formattedDuration}
  </div>
</div>

<style>
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
  #prev-file,
  #next-file {
    font-size: 1.5em;
    margin-left: 0.3em;
  }
  #folder-name {
    cursor: pointer;
  }
  #play-icon path {
    fill: var(--primary);
  }
  .progress {
    flex-grow: 1;
    margin-left: 1rem;
    padding-top: 1.2rem;
  }
  .total-time {
    margin-left: 1rem;
  }
  .play-time {
    margin-left: 1rem;
    width: 4rem;
    text-align: end;
  }
  .player {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  button {
    all: initial;
    cursor: pointer;
    color: var(--primary);
  }
  .play-btn button {
    font-size: 32px;
  }
  label {
    display: inline;
    font-weight: bold;
  }
  .info {
    margin-top: 0.5em;
  }
</style>
