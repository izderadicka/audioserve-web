<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
  import { debug } from "svelte/internal";
  import type { Unsubscriber } from "svelte/store";
  import type { Cache } from "../cache";
  import Play from 'svelte-material-icons/Play.svelte';

  import type { AudioFile, Subfolder } from "../client";
  import {
    cachedItem,
    colApi,
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
  import { splitPath, splitUrl } from "../util";
  import FileItem from "./FileItem.svelte";
  import FolderItem from "./FolderItem.svelte";

  const cache: Cache = getContext("cache");

  let subfolders: Subfolder[] = [];
  let files: AudioFileExt[] = [];
  let folderPath: string | undefined;

  async function searchFor(query: string) {
    try {
      const result = await $colApi.colIdSearchGet({
        colId: $selectedCollection,
        q: query,
        group: $group,
      });

      subfolders = result.subfolders;
      files = [];
    } catch (err) {}
  }

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
        group: $group,
      });
      const cachedPaths = await cache.getCachedPaths(
        $selectedCollection,
        folder
      );
      console.debug("Cached files for this folder", cachedPaths);
      files = audioFolder.files!.map((file: AudioFileExt) => {
        if (cachedPaths.indexOf(file.path) >= 0) {
          file.cached = true;
        }
        return file;
      });
      subfolders = audioFolder.subfolders!;
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
      // restore last played file, if possible
      if (folderPath === undefined) {
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
    }
  }

  function navigateTo(folder: string) {
    return () => ($currentFolder = { value: folder, type: FolderType.REGULAR });
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

  $: if ($currentFolder != undefined) {
    if ($currentFolder.type === FolderType.REGULAR) {
      loadFolder($currentFolder.value);
    } else if ($currentFolder.type === FolderType.SEARCH) {
      searchFor($currentFolder.value);
    }
  }

  unsubsribe.push(
    cachedItem.subscribe((item) => {
      if (item) {
        console.log("File cached", item);
        // update folder
        const { collection, path } = splitUrl(item.originalUrl);

        // update folder
        if (collection === $selectedCollection) {
          const position = files.findIndex((f) => f.path == path);
          if (position >= 0) {
            let f = files[position];
            f.cached = true;
            files[position] = f;
          }
        }
        // update playlist
        const { folder, file } = splitPath(path);
        if ($playList.collection == collection && $playList.folder == folder) {
          playList.update((pl) => {
            const position = pl.files.findIndex((f) => f.path == path);
            if (position >= 0) {
              pl.files[position].cached = true;
            }
            return pl;
          });
        }
      }
    })
  );

  onMount(async () => {});
  onDestroy(() => unsubsribe.forEach((u) => u()));
</script>

<div id="browser">
  <div class="main-browser-panel">
    {#if subfolders.length > 0}
      <details open>
        <summary>Subfolders</summary>
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
        <summary>Files</summary>
        <ul>
          {#each files as file, pos}
            <li on:click={startPlaying(pos, true, 0)}>
              <FileItem
                name={file.name}
                duration={file.meta.duration}
                bitrate={file.meta.bitrate}
                position={pos}
                cached={file.cached}
              />
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>
  <div class="browser-sidebar">
    <div class="last-position">
      <h6>Last Remote Position</h6>
      <button><Play/> {"usak"} at {"23:23"}</button>
    </div>
    <details id="last-remote-position" open>
    </details>
  </div>
</div>

<style>
  h6 {
    margin-bottom: 0.5em;
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
    min-width: 360px;
  }

  @media (max-width: 770px) {
    
    #browser {
        flex-direction: column;
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
