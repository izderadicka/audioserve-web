<script type="ts">
  import {
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";

  import { formatTime } from "../util";

  export let name: string;
  export let duration: number;
  export let bitrate: number;
  export let position: number;
  let formattedDuration = formatTime(duration);
  $: isPlaying =
    $playItem && $playList &&
    $playItem.position === position &&
    $playItem.name === name &&
    $playList.folder === $currentFolder &&
    $playList.collection === $selectedCollection;
</script>

<div class:active="{isPlaying}">
  {#if isPlaying}<span class="playing">▶ </span>{/if}
  <span class="file-name">{name}</span>
  <span class="time">({formattedDuration})</span>
  <span class="bitrate">{bitrate}kbps</span>
</div>

<style>
  .active {
      background-color: var(--primary-focus);
  }
  .file-name {
    font-weight: bold;
    font-size: 1.2rem;
  }
  .playing {
    font-size: 1.3rem;
  }
</style>
