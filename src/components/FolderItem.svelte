<script lang="ts">
  import { beforeUpdate } from "svelte";

  import type { Subfolder } from "../client";
  import { selectedCollection, apiConfig } from "../state/stores";
  import { splitPath } from "../util";
  import FolderIcon from "./FolderIcon.svelte";

  export let subfolder: Subfolder;
  export let extended = false;
  export let finished = false;

  let basedir: string | undefined;

  beforeUpdate(() => {
    basedir = splitPath(subfolder.path).folder;
  });
</script>

<div class="item">
  <div class="icon">
    <FolderIcon name={subfolder.name} path={subfolder.path} />
  </div>
  <div class="info">
    <h4 class="title item-header" class:finished role="link">
      {subfolder.name}
    </h4>
    {#if extended && basedir}
      <h6 class="subtitle">{basedir}</h6>
    {/if}
  </div>
</div>

<style>
  .item {
    display: flex;
    flex-direction: row;
  }

  .icon {
    margin-right: 1em;
  }
  .title {
    margin-bottom: 0.15rem;
  }

  .finished {
    font-style: italic;
    color: var(--secondary);
  }

  .finished::after {
    content: " ✓";
  }

  .subtitle {
    font-style: italic;
    margin-left: 1rem;
    font-weight: normal;
    margin-bottom: 0.1rem;
  }
</style>
