<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import type { AudioFile, Subfolder } from "../client";
  import {
    colApi,
    currentFolder,
    isAuthenticated,
    selectedCollection,
  } from "../state/stores";
  import { StorageKeys } from "../types/enums";

  let subfolders: Subfolder[] = [];
  let files: AudioFile[] = [];
  let folderPath: string | undefined;

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
      });
      files = audioFolder.files!;
      subfolders = audioFolder.subfolders!;
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
      folderPath = folder;
    } catch (resp) {
      console.error("Cannot load folder", resp);
      if (resp.status === 404) {
        $currentFolder = "";
      } else if (resp.status === 401) {
        $isAuthenticated = false;
      }
    }
  }

  function navigateTo(folder: string) {
    return () => ($currentFolder = folder);
  }

  function startPlaying(file: string) {
    return () => {
      console.debug("Click action to start to play: " + file);
    };
  }

  const unsubsribe = selectedCollection.subscribe((col) => {
    if (col != undefined) {
      if (folderPath === undefined) {
        // restore last path from localStorage
        $currentFolder = localStorage.getItem(StorageKeys.LAST_FOLDER) || "";
      } else {
        // go to root of other collection
        $currentFolder = "";
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
  });

  $: if ($currentFolder != undefined) {
    loadFolder($currentFolder);
  }

  onMount(async () => {});
  onDestroy(unsubsribe);
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
      {#each files as file}
        <li on:click={startPlaying(file.path)}>{file.name}</li>
      {/each}
    </ul>
  </details>
{/if}

<style>
  summary {
    font-weight: bold;
    font-size: 1.5rem;
  }
  ul {
    padding-left: 0;
  }
  ul li {
    list-style-type: none;
    cursor: pointer;
  }
</style>
