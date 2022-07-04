<script type="ts">
  import {
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { formatTime } from "../util/date";
  import { splitExtInName } from "../util";
  import Cached from "svelte-material-icons/Cached.svelte";
  import Play from "svelte-material-icons/Play.svelte";
  import { FolderType } from "../types/enums";
  import type { AudioFileExt } from "../types/types";
  import { Scroller } from "../util/dom";

  export let file: AudioFileExt;
  export let position: number;
  export let container: HTMLElement;
  export let playFunction: (
    position: number,
    startPlay: boolean,
    time: number
  ) => void;

  $: scroller = container ? new Scroller(container) : null;
  let tags: any = file.meta?.tags;
  let title: string;

  let baseName: string;
  let extension: string;

  $: {
    ({ baseName, extension } = splitExtInName(file));
    title = preprocessTitle(tags);
  }

  let elem: HTMLElement;
  let formattedDuration = formatTime(file.meta?.duration);

  function preprocessTitle(tags: any) {
    let title = tags?.title;
    if (!title) return;
    if (title == baseName) return;
    if (title == baseName.replace("_", " ")) return;
    return title;
  }

  $: isPlaying =
    $playItem &&
    $playList &&
    $playItem.position === position &&
    $playItem.path === file.path &&
    $playList.folder === $currentFolder.value &&
    $currentFolder.type === FolderType.REGULAR &&
    $playList.collection === $selectedCollection;
  $: if (isPlaying && elem && scroller) {
    scroller.scrollToView(elem);
  }
</script>

<li on:click={() => playFunction(position, true, 0)}>
  <div bind:this={elem} class="item" class:active={isPlaying}>
    {#if isPlaying}<div aria-label="Now playing"><Play size="2rem" /></div>{/if}
    <div class="info">
      <h4 class="file-name item-header" role="link">{baseName}</h4>
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
      {#if file.cached}
        <span aria-label="Cached"><Cached size="1.2em" /></span>
      {/if}
    </div>
  </div>
</li>

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
