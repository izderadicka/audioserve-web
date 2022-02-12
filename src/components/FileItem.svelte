<script type="ts">
  import {
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";

  import { formatTime } from "../util";
  import Cached from 'svelte-material-icons/Cached.svelte';
  import Play from 'svelte-material-icons/Play.svelte';
import { FolderType } from "../types/enums";

  export let name: string;
  export let duration: number;
  export let bitrate: number;
  export let position: number;
  export let cached: boolean = false;
  export let container: HTMLElement;

  let elem: HTMLElement;
  let formattedDuration = formatTime(duration);

  enum Scroll {UP, DOWN, NO};

  function needScroll() {
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const top = elem.offsetTop;
    const bottom = top + elem.clientHeight;
    if (top>=containerTop && bottom<=containerBottom) {
      return Scroll.NO
    } else if (bottom > containerBottom) {
      return Scroll.UP
    } else {
      return Scroll.DOWN
    }

  }

  $: isPlaying =
    $playItem && $playList &&
    $playItem.position === position &&
    $playItem.name === name &&
    $playList.folder === $currentFolder.value &&
    $currentFolder.type === FolderType.REGULAR &&
    $playList.collection === $selectedCollection;
  $: if (isPlaying && elem && container) {
    const scrollDirection = needScroll();
    if (scrollDirection !== Scroll.NO) {
      elem.scrollIntoView(scrollDirection===Scroll.DOWN?true:false)
    }
  }
</script>

<div bind:this={elem} class:active="{isPlaying}">
  {#if isPlaying}<Play size="2rem"/>{/if}
  <span class="file-name">{name}</span>
  <span class="time">({formattedDuration})</span>
  <span class="bitrate">{bitrate}kbps</span>
  <div class="icons">
    {#if cached}<Cached/>{/if}
  </div>
</div>

<style>

  .icons {
    float: right;
  }
  
  .active {
      background-color: var(--primary-focus);
  }
  .file-name {
    font-weight: bold;
    font-size: 1.2rem;
  }
</style>
