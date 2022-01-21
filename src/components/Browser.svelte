<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";
import { debug } from "svelte/internal";
import type { Unsubscriber } from "svelte/store";
import type { Cache } from "../cache";

  import type { AudioFile, Subfolder } from "../client";
  import {
    apiConfig,
    cachedItem,
    colApi,
    currentFolder,
    isAuthenticated,
    playItem,
    playList,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";
import type { AudioFileExt } from "../types/types";
import { audioFileUrl, splitPath, splitUrl } from "../util";
import FileItem from "./FileItem.svelte";

  const cache: Cache = getContext('cache');

  let subfolders: Subfolder[] = [];
  let files: AudioFileExt[] = [];
  let folderPath: string | undefined;

  async function searchFor(query: string) {
    try {
      const result = await $colApi.colIdSearchGet({
        colId: $selectedCollection,
        q: query
      });

      subfolders = result.subfolders;
      files = [];

    } catch (err) {

    }
  }

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
      });
      const cachedPaths = await cache.getCachedPaths($selectedCollection, folder);
      console.debug("Cached files for this folder", cachedPaths);
      files = audioFolder.files!.map((file: AudioFileExt) => {
        if (cachedPaths.indexOf(file.path) >=0) {
          file.cached=true;
        }
        return file;
      });
      subfolders = audioFolder.subfolders!;
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
      // restore last played file, if possible
      if (folderPath === undefined) {
      const prevFile = localStorage.getItem(StorageKeys.LAST_FILE);
        if (prevFile) {
            console.debug(`Can try to play ${prevFile} in folder ${$currentFolder} in collection ${$selectedCollection}`);
            const position = files.findIndex((f) => f.path === prevFile);
            if (position>=0) {
                let time:number|undefined;
                try {
                    time = parseFloat(localStorage.getItem(StorageKeys.LAST_POSITION));
                } catch (e) {
                    console.log("Invalid last position", e);
                }
                startPlaying(position, false, time)()
            }
        }
    }   

      folderPath = folder;
    } catch (resp) {
      console.error("Cannot load folder", resp);
      if (resp.status === 404) {
        $currentFolder = {value:"", type: FolderType.REGULAR};
      } else if (resp.status === 401) {
        $isAuthenticated = false;
      }
    }
  }

  function navigateTo(folder: string) {
    return () => ($currentFolder = {value:folder, type:FolderType.REGULAR});
  }

  function startPlaying(position: number, startPlay = true, time?: number) {
    return () => {
      const file = files[position];
      const fileURL = audioFileUrl(file);
      const duration = file.meta?.duration;
      console.debug("Action to start to play: " + fileURL);
      $playList = {
        files,
        collection: $selectedCollection,
        folder: $currentFolder.value,
      };
      $playItem = {
        url: fileURL,
        duration,
        name: file.name,
        path: file.path,
        cached: file.cached,
        position,
        startPlay,
        time
      };
    };
  }

  const unsubsribe: Unsubscriber[] = [];

 unsubsribe.push(selectedCollection.subscribe((col) => {
    if (col != undefined) {
      if (folderPath === undefined) {
        // restore last path from localStorage
        $currentFolder = {value:localStorage.getItem(StorageKeys.LAST_FOLDER) || "", type: FolderType.REGULAR};
      } else {
        // go to root of other collection
        $currentFolder = {value:"", type: FolderType.REGULAR};
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
  }));

  $: if ($currentFolder != undefined) {
    if ($currentFolder.type === FolderType.REGULAR) {
        loadFolder($currentFolder.value);
    } else if ($currentFolder.type === FolderType.SEARCH) {
       searchFor($currentFolder.value);
    }
  }

 unsubsribe.push(cachedItem.subscribe((item) =>
 {
   if (item) {
    console.log("File cached", item);
    // update folder
    const {collection, path} = splitUrl(item.originalUrl);

    // update folder
    if (collection === $selectedCollection) {
      const position = files.findIndex((f) => f.path == path)
      if (position>=0) {
        let f = files[position];
        f.cached = true;
        files[position] = f;
      }
    }
    // update playlist 
    const {folder, file} = splitPath(path);
    if ($playList.collection == collection && $playList.folder == folder) {
      playList.update((pl) => {

        const position = pl.files.findIndex((f) => f.path == path)
      if (position>=0) {
        pl.files[position].cached = true;
      }
        return pl
      })
    }
    
   }
 }
 ))

  onMount(async () => {});
  onDestroy(() => unsubsribe.forEach( u => u()));
</script>

{#if subfolders.length > 0}
  <details open>
    <summary>Subfolders</summary>
    <ul>
      {#each subfolders as fld}
        <li on:click={navigateTo(fld.path)}>{fld.name}</li>
      {/each}
    </ul>
  </details>
{/if}
{#if files.length > 0}
  <details open>
    <summary>Files</summary>
    <ul>
      {#each files as file, pos}
        <li on:click={startPlaying(pos,true, 0)}><FileItem name="{file.name}" duration="{file.meta.duration}" 
            bitrate="{file.meta.bitrate}" position="{pos}" cached={file.cached}/></li>
      {/each}
    </ul>
  </details>
{/if}

<style>
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
      color: var(--primary);
  }
</style>
