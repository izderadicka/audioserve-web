<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Unsubscriber } from "svelte/store";
  import { Cache, CacheEvent, EventType } from "../cache";
  import ContinuePlay from "svelte-material-icons/PlayCircleOutline.svelte";
  import SortNameIcon from "svelte-material-icons/SortAlphabeticalAscending.svelte";
  import SortTimeIcon from "svelte-material-icons/SortClockAscendingOutline.svelte";
  import DownloadFolderIcon from "svelte-material-icons/BriefcaseDownloadOutline.svelte";

  import type { AudioFile, PositionShort, Subfolder } from "../client";
  import {
    apiConfig,
    colApi,
    collections,
    currentFolder,
    group,
    isAuthenticated,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";
  import { PlayItem } from "../types/play-item";
  import type { AudioFileExt } from "../types/types";
  import { formatTime, splitExt, splitPath, splitUrl } from "../util";
  import FileItem from "./FileItem.svelte";
  import FolderItem from "./FolderItem.svelte";
  import Description from "./Description.svelte";
  import Cover from "./Cover.svelte";
  import type { HistoryRecord, HistoryWrapper } from "../util/history";
  import { getLocationPath } from "../util/browser";

  const cache: Cache = getContext("cache");
  const history: HistoryWrapper = getContext("history");

  export let container: HTMLDivElement;

  let subfolders: Subfolder[] = [];
  let files: AudioFileExt[] = [];
  let folderPath: string | undefined;
  let searchQuery: string | undefined;
  let folderTime: number;
  let sharedPosition: PositionShort | null;
  let sharePositionDisplayName: string;

  let descriptionPath: string;
  let coverPath: string;

  let sortTime = false;
  const toggleSubfoldersSort = () => {
    sortTime = !sortTime;
    subfolders = sortSubfolders(subfolders);
  };

  function sortSubfolders(subs: Subfolder[]) {
    return subs.sort((a, b) => {
      if (sortTime) {
        return a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0;
      } else {
        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
      }
    });
  }

  async function searchFor(query: string) {
    try {
      const result = await $colApi.colIdSearchGet({
        colId: $selectedCollection,
        q: query,
        group: $group,
      });

      subfolders = result.subfolders;
      files = [];

      searchQuery = query;

      // Other properties are not relevant and should be reset
      sharedPosition = undefined;
      folderPath = undefined;
      folderTime = undefined;
      descriptionPath = undefined;
      coverPath = undefined;
    } catch (err) {}
  }

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
        group: $group,
      });
      const cachedPaths = await cache?.getCachedPaths(
        $selectedCollection,
        folder
      );
      console.debug("Cached files for this folder", cachedPaths);

      files =
        cachedPaths && cachedPaths.length > 0
          ? audioFolder.files!.map((file: AudioFileExt) => {
              if (cachedPaths.indexOf(file.path) >= 0) {
                file.cached = true;
              }
              return file;
            })
          : audioFolder.files!;
      subfolders = sortTime
        ? sortSubfolders(audioFolder.subfolders!)
        : audioFolder.subfolders!;
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
      sharedPosition = audioFolder.position;
      sharePositionDisplayName = null;
      if (sharedPosition) {
        files.forEach((f) => {
          if (f.path === sharedPosition.path) {
            sharePositionDisplayName = splitExt(f.name).baseName;
          }
        });
      }

      folderTime = audioFolder.totalTime;
      descriptionPath = audioFolder.description?.path;
      coverPath = audioFolder.cover?.path;

      // restore last played file, if possible
      if (!$playItem && folderPath === undefined) {
        const prevFile = localStorage.getItem(StorageKeys.LAST_FILE);
        if (prevFile) {
          console.debug(
            `Can try to play ${prevFile} in folder ${$currentFolder} in collection ${$selectedCollection}`
          );
          const position = files.findIndex((f) => f.path === prevFile);
          if (position >= 0) {
            let time: number | undefined;
            try {
              time = parseFloat(
                localStorage.getItem(StorageKeys.LAST_POSITION)
              );
            } catch (e) {
              console.log("Invalid last position", e);
            }
            startPlaying(position, false, time)();
          }
        }
      }

      folderPath = folder;
    } catch (resp) {
      console.error("Cannot load folder", resp);
      if (resp.status === 404) {
        $currentFolder = { value: "", type: FolderType.REGULAR };
      } else if (resp.status === 401) {
        $isAuthenticated = false;
      }
    } finally {
      searchQuery = undefined;
    }
  }

  export function constructHistoryState(scrollTo?: number): HistoryRecord {
    if (searchQuery != null) {
      return {
        folderType: FolderType.SEARCH,
        value: searchQuery,
        collection: $selectedCollection,
        scrollTo,
      };
    } else if (folderPath != null) {
      return {
        folderType: FolderType.REGULAR,
        value: folderPath,
        collection: $selectedCollection,
        scrollTo,
      };
    }
  }

  function navigateTo(folder: string) {
    return () => {
      $currentFolder = { value: folder, type: FolderType.REGULAR };
    };
  }

  function playSharedPosition() {
    const idx = files.findIndex((f) => f.path === sharedPosition.path);
    if (idx >= 0) {
      startPlaying(idx, true, sharedPosition.position)();
    }
  }

  function startPlaying(position: number, startPlay = true, time?: number) {
    return () => {
      const file = files[position];
      const item = new PlayItem({
        file,
        position,
        startPlay,
        time,
      });
      console.debug("Action to start to play: " + item.url);
      $playList = {
        files,
        collection: $selectedCollection,
        folder: $currentFolder.value,
        totalTime: folderTime,
      };
      $playItem = item;
    };
  }

  const unsubsribe: Unsubscriber[] = [];

  unsubsribe.push(
    selectedCollection.subscribe((col) => {
      if (col != undefined) {
        if (folderPath === undefined) {
          // restore last path from localStorage
          $currentFolder = {
            value: localStorage.getItem(StorageKeys.LAST_FOLDER) || "",
            type: FolderType.REGULAR,
          };
        } else {
          // go to root of other collection
          $currentFolder = { value: "", type: FolderType.REGULAR };
          if (folderPath === "") {
            // TODO: fix it by having currentFolder as object
            // have to enforce reload
            loadFolder("");
          }
        }
        localStorage.setItem(
          StorageKeys.LAST_COLLECTION,
          $selectedCollection.toString()
        );
      }
    })
  );

  function folderIsPlaying(): boolean {
    return (
      $playList &&
      $playList.collection === $selectedCollection &&
      $playList.folder === folderPath
    );
  }

  $: if ($currentFolder != undefined) {
    let done: Promise<void>;
    const scrollTo = $currentFolder.scrollTo;
    if ($currentFolder.type === FolderType.REGULAR) {
      done = loadFolder($currentFolder.value);
    } else if ($currentFolder.type === FolderType.SEARCH) {
      done = searchFor($currentFolder.value);
    }

    done.then(() => {
      history.add(constructHistoryState());
      if (scrollTo && !folderIsPlaying()) {
        // Do not scroll to history postion if current folder is playing
        container.scrollTo({ top: scrollTo });
      }
    });
  }

  const globalPathPrefix = getLocationPath();

  function handleCacheEvent(evt: CacheEvent) {
    const item = evt.item;
    if (item) {
      const cached = evt.kind === EventType.FileCached;
      console.log("File cached", item);
      const { collection, path } = splitUrl(item.originalUrl, globalPathPrefix);

      // update folder
      if (collection === $selectedCollection) {
        const position = files.findIndex((f) => f.path == path);
        if (position >= 0) {
          let f = files[position];
          f.cached = cached;
          files[position] = f;
        }
      }
      // update playlist
      const { folder, file } = splitPath(path);
      if ($playList.collection == collection && $playList.folder == folder) {
        playList.update((pl) => {
          const position = pl.files.findIndex((f) => f.path == path);
          if (position >= 0) {
            pl.files[position].cached = cached;
          }
          return pl;
        });
      }
    }
  }

  cache?.addListener(handleCacheEvent);

  let scrollDebounceTimer: number;
  const scrollDebounce = (cb: () => void) => {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = window.setTimeout(cb, 250);
  };
  function updateScroll() {
    scrollDebounce(() => {
      history.update(constructHistoryState(container.scrollTop));
    });
  }

  $: container?.addEventListener("scroll", updateScroll);

  onMount(async () => {});
  onDestroy(() => {
    unsubsribe.forEach((u) => u());
    cache?.removeListener(handleCacheEvent);
    container.removeEventListener("scroll", updateScroll);
  });

  function generateDownloadPath(): string {
    return (
      $apiConfig.basePath +
      `/${$selectedCollection}/download/${encodeURI(folderPath)}`
    );
  }
</script>

<div id="browser">
  <div class="main-browser-panel">
    {#if subfolders.length > 0}
      <details open>
        <summary
          >Subfolders
          <span
            class="summary-icons"
            on:click|stopPropagation|preventDefault={toggleSubfoldersSort}
          >
            {#if sortTime}
              <SortTimeIcon />
            {:else}
              <SortNameIcon />
            {/if}
          </span>
        </summary>
        <ul>
          {#each subfolders as fld}
            <li on:click={navigateTo(fld.path)}>
              <FolderItem
                subfolder={fld}
                extended={$currentFolder.type != FolderType.REGULAR}
              />
            </li>
          {/each}
        </ul>
      </details>
    {/if}
    {#if files.length > 0}
      <details open>
        <summary
          >Files
          {#if $collections && $collections.folderDownload}
            <a href={generateDownloadPath()} target="_self"
              ><span class="summary-icons"><DownloadFolderIcon /></span></a
            >
          {/if}
        </summary>
        <ul>
          {#each files as file, pos}
            <li on:click={startPlaying(pos, true, 0)}>
              <FileItem
                name={file.name}
                duration={file.meta.duration}
                bitrate={file.meta.bitrate}
                position={pos}
                cached={file.cached}
                {container}
              />
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>
  {#if $currentFolder && $currentFolder.type === FolderType.REGULAR}
    <div class="browser-sidebar">
      {#if sharedPosition}
        <div class="last-position" id="last-remote-position">
          <button on:click={playSharedPosition}
            ><ContinuePlay size="2rem" />
            {sharePositionDisplayName} at {formatTime(
              sharedPosition.position
            )}</button
          >
        </div>
      {/if}
      <details open>
        <summary>Info</summary>
        <div id="folder-cover">
          {#if coverPath}
            <Cover {coverPath} />
          {/if}
        </div>
        <div id="folder-tags" />
        <div id="folder-description">
          {#if descriptionPath}
            <Description {descriptionPath} />
          {/if}
        </div>
      </details>
    </div>
  {/if}
</div>

<style>
  .summary-icons {
    color: var(--primary);
  }
  .browser-sidebar button {
    overflow: hidden;
  }
  #browser {
    display: flex;
    flex-wrap: nowrap;
    flex-direction: row;
  }

  .main-browser-panel {
    width: 100%;
    margin-right: 3em;
  }

  .browser-sidebar {
    width: 66%;
    padding-right: 1rem;
  }

  @media (max-width: 770px) {
    #browser {
      flex-direction: column-reverse;
    }
    .browser-sidebar {
      width: 100%;
      padding-right: 0;
    }
  }
  summary {
    font-weight: bold;
    font-size: 1.5rem;
    line-height: 1.5rem;
  }
  ul {
    padding-left: 0;
  }
  ul li {
    list-style-type: none;
    cursor: pointer;
    border-bottom: 1px solid var(--accordion-border-color);
  }

  ul li:hover {
    color: var(--primary) !important;
  }
</style>
