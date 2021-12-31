<script lang="ts">
  import { onMount } from "svelte";

  import type { AudioFile, Subfolder } from "../client";
  import { colApi, currentFolder, isAuthenticated, selectedCollection } from "../state/stores";
  import { StorageKeys } from "../types/enums";

  let subfolders: Subfolder[] = [];
  let files: AudioFile[] = [];

  async function loadFolder(folder: string) {
    try {
      const audioFolder = await $colApi.colIdFolderPathGet({
        colId: $selectedCollection,
        path: folder,
      });
      files = audioFolder.files!;
      subfolders = audioFolder.subfolders!;
      localStorage.setItem(StorageKeys.LAST_FOLDER, folder);
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

  $: if ($selectedCollection != undefined) {
    $currentFolder = localStorage.getItem(StorageKeys.LAST_FOLDER) || "";
    localStorage.setItem(
      StorageKeys.LAST_COLLECTION,
      $selectedCollection.toString()
    );
  }

  $: if ($currentFolder != undefined) {
    loadFolder($currentFolder);
  }

  onMount(async () => {});
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
