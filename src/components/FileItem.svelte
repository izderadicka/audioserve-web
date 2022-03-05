<script type="ts">
  import {
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";

  import { formatTime, splitExt } from "../util";
  import Cached from "svelte-material-icons/Cached.svelte";
  import Play from "svelte-material-icons/Play.svelte";
  import { FolderType } from "../types/enums";

  export let name: string;
  export let duration: number;
  export let bitrate: number;
  export let position: number;
  export let cached: boolean = false;
  export let container: HTMLElement;

  let baseName: string;
  let extension: string;

  $: {
    ({ baseName, extension } = splitExt(name));
  }

  let elem: HTMLElement;
  let formattedDuration = formatTime(duration);

  enum Scroll {
    UP,
    DOWN,
    NO,
  }

  function needScroll() {
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
    const top = elem.offsetTop;
    const bottom = top + elem.clientHeight;
    if (top >= containerTop && bottom <= containerBottom) {
      return Scroll.NO;
    } else if (bottom > containerBottom) {
      return Scroll.UP;
    } else {
      return Scroll.DOWN;
    }
  }

  $: isPlaying =
    $playItem &&
    $playList &&
    $playItem.position === position &&
    $playItem.name === name &&
    $playList.folder === $currentFolder.value &&
    $currentFolder.type === FolderType.REGULAR &&
    $playList.collection === $selectedCollection;
  $: if (isPlaying && elem && container) {
    const scrollDirection = needScroll();
    if (scrollDirection !== Scroll.NO) {
      elem.scrollIntoView(scrollDirection === Scroll.DOWN ? true : false);
    }
  }
</script>

<div bind:this={elem} class="item" class:active={isPlaying}>
  {#if isPlaying}<div><Play size="2rem" /></div>{/if}
  <div class="info">
    <div class="file-name">{baseName}</div>
    <div class="meta">
      <span class="time">{formattedDuration}</span>
      <span class="bitrate">{bitrate}kbps</span>
      <span class="extension">{extension}</span>
    </div>
  </div>
  <div class="icons">
    {#if cached}<Cached size="1.2em"/>{/if}
  </div>
</div>

<style>
  .item {
    display: flex;
  }

  .icons {
    vertical-align: middle;
    margin:auto;
  }

  .info {
    flex-grow: 1;
  }

  .active {
    background-color: var(--primary-focus);
  }

  .meta {
    font-size: 0.8rem;
  }

  .meta span{
    margin-right: 0.5rem;
  }

  .file-name {
    font-weight: bold;
    font-size: 1.2rem;
  }
</style>
