<script type="ts">
  import {
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";

  import { formatTime, splitExtInName } from "../util";
  import Cached from "svelte-material-icons/Cached.svelte";
  import Play from "svelte-material-icons/Play.svelte";
  import { FolderType } from "../types/enums";
  import type { AudioFileExt } from "../types/types";

  export let file: AudioFileExt;
  export let position: number;
  export let container: HTMLElement;
  let tags: any = file.meta?.tags;
  let title = preprocessTitle(tags);

  const scrollOffset = 26;

  let baseName: string;
  let extension: string;

  $: {
    ({ baseName, extension } = splitExtInName(file));
  }

  let elem: HTMLElement;
  let formattedDuration = formatTime(file.meta?.duration);

  enum Scroll {
    UP,
    DOWN,
    NO,
  }

  function preprocessTitle(tags: any) {
    let title = tags?.title;
    if (!title) return;
    if (title == file.name) return;
    if (title == file.name.replace("_", " ")) return;
    return title;
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
    $playItem.path === file.path &&
    $playList.folder === $currentFolder.value &&
    $currentFolder.type === FolderType.REGULAR &&
    $playList.collection === $selectedCollection;
  $: if (isPlaying && elem && container) {
    const scrollDirection = needScroll();
    if (scrollDirection !== Scroll.NO) {
      elem.scrollIntoView(scrollDirection === Scroll.DOWN ? true : false);
      if (scrollDirection === Scroll.UP) {
        container.scrollBy({ top: scrollOffset });
      }
    }
  }
</script>

<div bind:this={elem} class="item" class:active={isPlaying}>
  {#if isPlaying}<div><Play size="2rem" /></div>{/if}
  <div class="info">
    <h4 class="file-name">{baseName}</h4>
    {#if title}
      <h6 class="title">{title}</h6>
    {/if}
    <div class="meta">
      <span class="time">{formattedDuration}</span>
      <span class="bitrate">{file.meta?.bitrate}kbps</span>
      {#if extension}<span class="extension">{extension}</span>{/if}
    </div>
  </div>
  <div class="icons">
    {#if file.cached}<Cached size="1.2em" />{/if}
  </div>
</div>

<style>
  .title {
    margin-bottom: 0.1rem;
  }
  .item {
    display: flex;
  }

  .icons {
    vertical-align: middle;
    margin: auto;
  }

  .info {
    flex-grow: 1;
    overflow: hidden;
  }

  .active {
    background-color: var(--primary-focus);
  }

  .meta {
    font-size: 0.8rem;
  }

  .meta span {
    margin-right: 0.5rem;
  }

  .file-name {
    margin-bottom: 0.15rem;
  }
</style>
