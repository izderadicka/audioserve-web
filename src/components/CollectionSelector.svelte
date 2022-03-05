<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import { collections, selectedCollection } from "../state/stores";

  export let selected = 0;

  let cols = [];

  const unsubsribe = collections.subscribe((c) => {
    if (c) cols = c.names;
  });

  onDestroy(unsubsribe);

  function changeCollection() {
    $selectedCollection = selected;
  }
</script>

<select name="collection" bind:value={selected} on:change={changeCollection}>
  {#each cols as colName, colId}
    <option value={colId} selected={$selectedCollection == colId}
      >{colName}</option
    >
  {/each}
</select>

<style>
</style>
