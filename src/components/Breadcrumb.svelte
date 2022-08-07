<script type="ts">
  import { currentFolder, selectedCollection } from "../state/stores";
  import { FolderType } from "../types/enums";
  import { constructHistoryFragment } from "../util/history";

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

<nav aria-label="Breadcrumb">
  <div class="breadcrumb">
    <a
      href={constructHistoryFragment({
        folderType: FolderType.REGULAR,
        collection: $selectedCollection,
        value: "",
      })}
      on:click|preventDefault={goHome}
      aria-current={pathSegments.length === 0 ? "page" : null}>Home</a
    >
    {#each pathSegments as seg, idx}
      <!-- svelte-ignore a11y-invalid-attribute -->
      /
      <a
        href={folderType === FolderType.SEARCH
          ? constructHistoryFragment({
              folderType,
              collection: $selectedCollection,
              value: $currentFolder.value,
            })
          : constructHistoryFragment({
              folderType: FolderType.REGULAR,
              collection: $selectedCollection,
              value: pathSegments.slice(0, idx + 1).join("/"),
            })}
        on:click|preventDefault={changeFolder(idx)}
        aria-current={idx === pathSegments.length - 1 ? "page" : null}
      >
        {seg}&nbsp;
      </a>
    {/each}
  </div>
</nav>

<style>
  nav {
    display: block;
  }
  .breadcrumb {
    padding: 0.5rem;
    background-color: var(--secondary-focus);
    margin-bottom: 1.5rem;
  }
</style>
