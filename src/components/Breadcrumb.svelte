<script type="ts">
  import { currentFolder } from "../state/stores";
  import { FolderType } from "../types/enums";

  const searchPrefix = "Search: ";
  let pathSegments: string[] = [];
  let folderType: FolderType = FolderType.REGULAR;

  $: {
    if ($currentFolder?.type === FolderType.REGULAR) {
      pathSegments = $currentFolder.value?.split("/") || [];
      folderType = FolderType.REGULAR;
    } else if ($currentFolder?.type === FolderType.SEARCH) {
      pathSegments = [searchPrefix + $currentFolder.value];
      folderType = FolderType.SEARCH;
    }
  }

  function goHome() {
    $currentFolder = { value: "", type: FolderType.REGULAR };
  }

  function changeFolder(idx: number) {
    return () => {
      if (folderType === FolderType.REGULAR) {
        const path = pathSegments.slice(0, idx + 1).join("/");
        $currentFolder = { value: path, type: FolderType.REGULAR };
      } else {
        let value = pathSegments[0].substring(searchPrefix.length);
        $currentFolder = { value, type: FolderType.SEARCH };
      }
    };
  }
</script>

<div class="breadcrumb">
  <a href="/" on:click|preventDefault={goHome}>Home</a>
  {#each pathSegments as seg, idx}
    <!-- svelte-ignore a11y-invalid-attribute -->
    / <a href="#" on:click|preventDefault={changeFolder(idx)}>{seg} </a>
  {/each}
</div>

<style>
  .breadcrumb {
    padding: 0.5rem;
    background-color: var(--secondary-focus);
    margin-bottom: 1.5rem;
  }
</style>
