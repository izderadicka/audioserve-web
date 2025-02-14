<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import type { Unsubscriber } from "svelte/store";
  import { EventType } from "../cache";
  import type { Cache, CacheEvent } from "../cache";
  import ContinuePlay from "svelte-material-icons/PlayCircleOutline.svelte";
  import SortNameIcon from "svelte-material-icons/SortAlphabeticalAscending.svelte";
  import SortTimeIcon from "svelte-material-icons/SortClockAscendingOutline.svelte";
  import DownloadFolderIcon from "svelte-material-icons/BriefcaseDownloadOutline.svelte";
  import ClockIcon from "svelte-material-icons/ClockOutline.svelte";
  import PodcastIcon from "svelte-material-icons/Podcast.svelte";

  import type {
    AudioFile,
    PositionShort,
    ResponseError,
    Subfolder,
  } from "../client";
  import {
    apiConfig,
    colApi,
    collections,
    currentFolder,
    currentFolderProperties,
    group,
    isAuthenticated,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, NavigateTarget, StorageKeys } from "../types/enums";
  import { PlayItem } from "../types/play-item";
  import type { AudioFileExt } from "../types/types";
  import { formatTime } from "../util/date";
  import {
    nonEmpty,
    sorted,
    splitExtInName,
    splitPath,
    splitUrl,
  } from "../util";
  import FileItem from "./FileItem.svelte";
  import FolderItem from "./FolderItem.svelte";
  import Description from "./Description.svelte";
  import Cover from "./Cover.svelte";
  import type { HistoryRecord, HistoryWrapper } from "../util/history";
  import { getLocationPath } from "../util/browser";
  import { Debouncer } from "../util/events";
  import Badge from "./Badge.svelte";
  import { Scroller } from "../util/dom";
  import { Observer } from "../util/intersect";

  const cache: Cache = getContext("cache");
  const history: HistoryWrapper = getContext("history");

  export let container: HTMLDivElement;
  let observer: Observer;
  $: {
    if (container) {
      observer = new Observer(container, { rootMargin: "64px" });
    }
  }

  export let infoOpen = false;
  export const navigate = (where: NavigateTarget) => {
    if (!folderIsPlaying()) {
      $selectedCollection = $playList.collection;
      $currentFolder = {
        value: $playList.folder,
        type: FolderType.REGULAR,
      };
    } else if (where === NavigateTarget.PLAY_ITEM) {
      const elem: HTMLElement = document.querySelector("div.item.active");
      if (elem != null) {
        const scroller = new Scroller(container);
        scroller.scrollToView(elem.parentElement);
      }
    }
  };

  let subfolders: Subfolder[] = [];
  let files: AudioFileExt[] = [];
  export const getFiles = () => files;
  let folderPath: string | undefined;
  let isCollapsed = false;
  let searchQuery: string | undefined;
  let folderTime: number;
  let folderTags: object = null;
  let sharedPosition: PositionShort | null;
  let sharePositionDisplayName: string;

  let descriptionPath: string;
  let coverPath: string;

  let sortTime = false;
  let collator = new window.Intl.Collator(navigator.language);
  const toggleSubfoldersSort = () => {
    sortTime = !sortTime;
    subfolders = sortSubfolders(subfolders);
  };

  function sortSubfolders(subs: Subfolder[]) {
    return subs.sort((a, b) => {
      if (sortTime) {
        return a.modified < b.modified ? 1 : a.modified > b.modified ? -1 : 0;
      } else {
        return collator.compare(a.name, b.name);
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
      isCollapsed = false;
      folderTime = undefined;
      folderTags = undefined;
      descriptionPath = undefined;
      coverPath = undefined;
    } catch (resp) {
      console.error("Cannot search", resp);
      if (resp.status === 401) {
        $isAuthenticated = false;
      } else {
        window.alert("Failed to search");
        if (folderPath) {
          $currentFolder = { type: FolderType.REGULAR, value: folderPath };
        }
      }
    }
  }

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
        group: $group || undefined,
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
      subfolders = sortSubfolders(audioFolder.subfolders!);
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
      sharedPosition = audioFolder.position;
      sharePositionDisplayName = null;
      if (sharedPosition) {
        files.forEach((f) => {
          if (f.path === sharedPosition.path) {
            sharePositionDisplayName = splitExtInName(f).baseName;
          }
        });
      }

      folderTime = audioFolder.totalTime;
      folderTags = audioFolder.tags;
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
              console.warn("Invalid last position", e);
            }
            startPlaying(position, false, time);
          }
        }
      }

      folderPath = folder;
      isCollapsed = !audioFolder.isFile && audioFolder.isCollapsed;
    } catch (e) {
      const resp = (e as ResponseError)?.response;
      console.error("Cannot load folder", resp);
      if (resp?.status === 404) {
        $currentFolder = { value: "", type: FolderType.REGULAR };
      } else if (resp?.status === 401) {
        $isAuthenticated = false;
      } else {
        window.alert(`Failed to load folder ${$currentFolder.value}`);
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
      startPlaying(idx, true, sharedPosition.position);
    }
  }

  function startPlaying(position: number, startPlay = true, time?: number) {
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
      hasImage: coverPath && coverPath.length > 0,
    };
    $playItem = item;
  }

  const unsubsribe: Unsubscriber[] = [];

  unsubsribe.push(
    selectedCollection.subscribe((col) => {
      if (col != undefined) {
        // initiall app load
        if (folderPath === undefined) {
          if (!$currentFolder) {
            // restore last path from localStorage
            $currentFolder = {
              value: localStorage.getItem(StorageKeys.LAST_FOLDER) || "",
              type: FolderType.REGULAR,
            };
          }
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
      if (!folderIsPlaying()) {
        // Do not scroll to history postion if current folder is playing
        // console.debug("History scroll to " + scrollTo);
        container.scrollTo({ top: scrollTo || 0 });
      }

      onFolderLoaded();
    });
  }

  function onFolderLoaded() {
    $currentFolderProperties.hasFiles = files.length > 0;
  }

  const globalPathPrefix = getLocationPath();

  function handleCacheEvent(evt: CacheEvent) {
    const item = evt.item;
    if (item) {
      const cached = evt.kind === EventType.FileCached;
      console.debug("File cached", item);
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
      if ($playList) {
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
  }

  cache?.addListener(handleCacheEvent);

  let scrollDebouncer = new Debouncer<void>(() => {
    history.update(constructHistoryState(container.scrollTop));
  }, 250);

  const updateScroll = () => scrollDebouncer.debounce();
  $: container?.addEventListener("scroll", updateScroll);

  onMount(async () => {});
  onDestroy(() => {
    unsubsribe.forEach((u) => u());
    cache?.removeListener(handleCacheEvent);
    container.removeEventListener("scroll", updateScroll);
    observer.close();
  });

  function generateDownloadPath(): string {
    return (
      $apiConfig.basePath +
      `/${$selectedCollection}/download/${encodeURIComponent(folderPath)}` +
      (isCollapsed ? "?collapsed" : "")
    );
  }

  function generateFeedPath(): string {
    return (
      $apiConfig.basePath +
      `/${$selectedCollection}/feed/${encodeURIComponent(folderPath)}`
    );
  }
</script>

<div id="browser">
  <div class="main-browser-panel">
    {#if subfolders.length > 0}
      <details open role="region" aria-label="Subfolders">
        <summary
          >Subfolders
          <Badge value={subfolders.length} />
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <span
            class="summary-icons button-like"
            on:click|stopPropagation|preventDefault={toggleSubfoldersSort}
            aria-label="Sort by {sortTime ? 'Time' : 'Name'}"
            role="button"
            tabindex="0"
          >
            {#if sortTime}
              <SortTimeIcon />
            {:else}
              <SortNameIcon />
            {/if}
          </span>
        </summary>
        <ul class="items-list">
          {#each subfolders as fld}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <li on:click={navigateTo(fld.path)}>
              <FolderItem
                {observer}
                subfolder={fld}
                extended={$currentFolder.type != FolderType.REGULAR}
                finished={fld.finished}
              />
            </li>
          {/each}
        </ul>
      </details>
    {/if}
    {#if files.length > 0}
      <details open role="region" aria-label="Files">
        <summary
          >Files
          <Badge value={files.length} />
          <span class="files-duration"
            ><ClockIcon />
            <span>{formatTime(folderTime)}</span></span
          >
          {#if $collections && $collections.folderDownload}
            <a href={generateDownloadPath()} target="_self"
              ><span class="summary-icons" aria-label="Download"
                ><DownloadFolderIcon /></span
              ></a
            >
          {/if}
          {#if $collections && $collections.rssFeed}
            <a href={generateFeedPath()} target="_blank"
              ><span class="summary-icons" aria-label="Download"
                ><PodcastIcon /></span
              ></a
            >
          {/if}
        </summary>
        <ul class="items-list">
          {#each files as file, pos}
            <FileItem
              {file}
              position={pos}
              {container}
              playFunction={startPlaying}
            />
          {/each}
        </ul>
      </details>
    {/if}
  </div>
  {#if $currentFolder && $currentFolder.type === FolderType.REGULAR}
    <div class="browser-sidebar">
      {#if sharedPosition && sharePositionDisplayName}
        <div class="last-position" id="last-remote-position">
          <button
            on:click={playSharedPosition}
            aria-label="Continue on last position in this folder"
            ><ContinuePlay size="2rem" />
            {sharePositionDisplayName} at {formatTime(
              sharedPosition.position
            )}</button
          >
        </div>
      {/if}
      {#if coverPath || descriptionPath || nonEmpty(folderTags)}
        <details bind:open={infoOpen} role="complementary">
          <summary>Info</summary>
          {#if infoOpen}
            {#if coverPath}
              <div id="folder-cover">
                <Cover {coverPath} />
              </div>
            {/if}
            {#if nonEmpty(folderTags)}
              <div id="folder-tags">
                <table role="grid">
                  <tbody>
                    {#each sorted(Object.keys(folderTags)) as k}
                      <tr>
                        <th>{k}</th>
                        <td>{folderTags[k]}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
            {#if descriptionPath}
              <div id="folder-description">
                <Description {descriptionPath} />
              </div>
            {/if}
          {/if}
        </details>
      {/if}
    </div>
  {/if}
</div>

<style>
  #folder-tags {
    margin-top: 1rem;
  }

  .files-duration {
    font-size: 80%;
    display: inline-block;
    font-weight: normal;
    vertical-align: text-bottom;
  }
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
</style>
