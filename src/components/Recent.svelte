<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import type { Position } from "../client";
  import {
    currentFolder,
    group,
    positionsApi,
    selectedCollection,
  } from "../state/stores";
  import { FolderType, StorageKeys } from "../types/enums";
  import ClosableTitle from "./ClosableTitle.svelte";
  import PositionItem from "./PositionItem.svelte";

  const dispatch = createEventDispatcher();

  const close = () => dispatch("close");
  let items: Position[] = [];
  onMount(() => {
    $positionsApi
      .positionsGroupGet({ group: $group })
      .then((positions) => (items = positions))
      .catch((e) => console.error("Cannot fetch recent positions", e));
  });

  const goToPosition = (position: Position) => {
    return () => {
      $selectedCollection = position.collection;
      $currentFolder = { value: position.folder, type: FolderType.REGULAR };
      localStorage.setItem(StorageKeys.LAST_FOLDER, position.folder);
      localStorage.setItem(StorageKeys.LAST_FILE, position.file);
      localStorage.setItem(
        StorageKeys.LAST_POSITION,
        position.position.toString()
      );
    };
  };
</script>

<div>
  <ClosableTitle on:close={close}>Recently Listened</ClosableTitle>
  <details open>
    <summary>Files</summary>
    <ul>
      {#each items as position}
        <li on:click={goToPosition(position)}><PositionItem {position} /></li>
      {/each}
    </ul>
  </details>
</div>

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
</style>
