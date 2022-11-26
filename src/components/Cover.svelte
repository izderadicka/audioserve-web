<script lang="ts">
  import { onMount } from "svelte";

  import { apiConfig, selectedCollection } from "../state/stores";

  let elem: HTMLDivElement;
  export let coverPath: string;

  const loadImage = (path: string) => {
    if (!elem || !path) return;
    elem.innerHTML = "";
    const imagePath =
      $apiConfig.basePath +
      "/" +
      $selectedCollection +
      "/cover/" +
      encodeURIComponent(path);
    const img = document.createElement("img");
    img.src = imagePath;
    elem.appendChild(img);
  };

  onMount(() => loadImage(coverPath));
  $: loadImage(coverPath);
</script>

<div bind:this={elem} />
