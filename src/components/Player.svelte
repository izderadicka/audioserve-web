<script lang="ts">
  import { getContext, onDestroy } from "svelte";
import type { Cache } from "../cache";

  import {
    apiConfig,
    cachedItem,
    config,
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";

  import { audioFileUrl, formatTime } from "../util";

  const cache: Cache = getContext('cache');
  let duration: number;
  $: formattedDuration = formatTime(duration);
  let currentTime: number;
  $: formattedCurrentTime = formatTime(currentTime);
  $: if (currentTime != undefined)
    localStorage.setItem(StorageKeys.LAST_POSITION, currentTime.toString());
  let paused: boolean;

  let player: HTMLAudioElement;

  let file = "";
  let folder = "";
  let folderPosition = 0;
  let collection:number;

  $: folderSize = $playList?.files.length || 0;

  const unsubscribe = playItem.subscribe(async (item) => {
    if (item && player) {
      let source;
      if (item.cached) {
        const cachedItem = await cache.getCachedUrl(item.url)!;
        source = cachedItem.cachedUrl;
        console.debug("Playing cached item", source);
      } else {
        source = item.url;
      }
      player.src = source;
      localStorage.setItem(StorageKeys.LAST_FILE, item.path);
      if (item.time != null) {
        currentTime = item.time;
      }
      if (item.startPlay) {
        player.play();
      } else {
        paused = true;
        duration = item.duration;
      }
      file = item.name;
      folderPosition = item.position;
      folder = $playList.folder;
      collection = $playList.collection;
      tryCacheAhead(folderPosition);
    }
  });

  function tryCacheAhead(pos: number) {
    const cacheAheadCount = $config.cacheAheadFiles;
    for (let newPos = pos+1; newPos<= pos+cacheAheadCount; newPos++) {
      if (newPos<$playList.files.length) {
        const nextFile = $playList.files[newPos];
        if (!nextFile.cached) {
          const url = audioFileUrl(nextFile, collection)
          cache.cacheAhead(url).then((cached)=>{
            $cachedItem=cached;
          }).catch((e)=>console.error("Caching file failed",e))
        }
      }
    }
  }

  function playPause() {
    if (paused) {
      player.play();
    } else {
      player.pause();
    }
  }

  function playerError(evt) {
    console.error("Player error", evt);
  }

  function tryNextFile() {
    let pos = $playItem.position;
    const nextPosition = pos + 1;
    playPosition(nextPosition);
  }


  function playPosition(nextPosition: number) {
    if (nextPosition >= 0 && nextPosition < $playList.files.length) {
      const nextFile = $playList.files[nextPosition];
      const url = audioFileUrl(nextFile, $playList.collection);
      $playItem = {
        url,
        duration: nextFile.meta?.duration,
        name: nextFile.name,
        path: nextFile.path,
        cached: nextFile.cached,
        position: nextPosition,
        startPlay: true,
      };
    }
  }

  function navigateToFolder() {
    const col = $playList.collection;
    const folder = $playList.folder;
    $selectedCollection = col;
    $currentFolder = {value:folder, type: FolderType.REGULAR};
  }

  function playPrevious() {
    playPosition($playItem.position - 1);
  }

  function playNext() {
    playPosition($playItem.position + 1);
  }

  onDestroy(unsubscribe);
</script>

<div class="info">
  <div>
    <label for="file-name"
      >File (<span>{folderSize?folderPosition+1:0}</span>/<span>{folderSize}</span>):
    </label>
    <span id="file-name">{file}</span>
    <button id="prev-file" on:click={playPrevious}>▲</button>
    <button id="next-file" on:click={playNext}>▼</button>
  </div>
  <div>
    <label for="folder-name">Folder: </label>
    <span id="folder-name" on:click={navigateToFolder}>{folder}</span>
  </div>
</div>
<div class="player">
  <audio
    preload="none"
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
      max={duration}
      bind:value={currentTime}
    />
  </div>
  <div class="total-time">
    {formattedDuration}
  </div>
</div>

<style>
  #prev-file,
  #next-file {
    font-size: 1.5em;
    margin-left: 0.5em;
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
