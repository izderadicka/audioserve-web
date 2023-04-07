<script lang="ts" context="module">
  let remFactor: number = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );
</script>

<script lang="ts">
  import {
    config,
    currentFolder,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { formatTime } from "../util/date";
  import { splitExtInName } from "../util";
  import Cached from "svelte-material-icons/Cached.svelte";
  import Play from "svelte-material-icons/Play.svelte";
  import PlayCircled from "svelte-material-icons/PlayCircleOutline.svelte";
  import { FolderType } from "../types/enums";
  import type { AudioFileExt } from "../types/types";
  import { Scroller } from "../util/dom";
  import { slideAction } from "../util/browser";
  import { spring } from "svelte/motion";

  export let file: AudioFileExt;
  export let position: number;
  export let container: HTMLElement;
  export let playFunction: (
    position: number,
    startPlay: boolean,
    time: number
  ) => void;

  $: scroller = container ? new Scroller(container) : null;
  let title: string;
  let baseName: string;
  let extension: string;
  let formattedDuration: string;

  $: {
    ({ baseName, extension } = splitExtInName(file));
    title = preprocessTitle(file.meta?.tags);
    formattedDuration = formatTime(file.meta?.duration);
  }

  let elem: HTMLElement;

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

  const DEFAULT_SPRING_PARAMS = { stiffness: 0.05, damping: 0.5 };
  const SLIDING_SPRING_PARAMS = { stiffness: 1, damping: 1 };
  let slidePct = spring(0, DEFAULT_SPRING_PARAMS);
  const slideActionIconSize = 2;
  let slideActionIconTop = 0;
  $: if (elem) {
    slideActionIconTop =
      (elem.clientHeight - remFactor * slideActionIconSize) / 2;
  }

  function handleSlide(evt: CustomEvent) {
    let delta = evt.detail.dx;
    delta = delta < 0 ? 0 : delta;
    let rel = delta / (elem.clientWidth / 2);
    $slidePct = rel > 1 ? 1 : rel;
  }
</script>

<li
  bind:this={elem}
  on:click={() => {
    if (!$config.enableSlideInBrowser) {
      playFunction(position, true, 0);
    }
  }}
  use:slideAction={{ disabled: !$config.enableSlideInBrowser }}
  on:slidestart={(evt) => {
    $slidePct = 0;
    slidePct.stiffness = SLIDING_SPRING_PARAMS.stiffness;
    slidePct.damping = SLIDING_SPRING_PARAMS.damping;
  }}
  on:slidemove={handleSlide}
  on:slideend={(evt) => {
    if ($slidePct > 0.9999) {
      playFunction(position, true, 0);
    }
    slidePct.stiffness = DEFAULT_SPRING_PARAMS.stiffness;
    slidePct.damping = DEFAULT_SPRING_PARAMS.damping;
    $slidePct = 0;
  }}
>
  {#if $slidePct > 0}
    <div
      class="play-slide-action"
      style:opacity={$slidePct * $slidePct}
      style:top={`${slideActionIconTop}px`}
    >
      <span>
        <PlayCircled size="{slideActionIconSize}rem" />
      </span>
    </div>
  {/if}

  <div
    class="item"
    draggable="false"
    class:active={isPlaying}
    style:transform={`translateX(${1.15 * slideActionIconSize * $slidePct}rem)`}
  >
    {#if isPlaying}<div aria-label="Now playing">
        <Play size="2rem" />
      </div>{/if}
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

  .play-slide-action {
    overflow-x: hidden;
    color: var(--primary);
    opacity: 1;
    position: absolute;
    z-index: 9999;
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
