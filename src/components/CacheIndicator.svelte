<script lang="ts">
  import { onMount } from "svelte";
  import { windowSize } from "../state/stores";

  export let offset = 0;
  export let totalTime = 0;
  export let ranges: { start: number; end: number }[];

  let indicator: HTMLDivElement;
  let bar: HTMLDivElement;
  let svelteBarClass = "";

  function update() {
    if (!indicator) return;
    let totalLength = indicator.offsetWidth;
    let offsetLength = (totalLength * offset) / totalTime;
    while (indicator.firstChild) {
      indicator.removeChild(indicator.firstChild);
    }

    for (const r of ranges) {
      let start = r.start;
      let end = r.end;
      start = offsetLength + (totalLength * start) / totalTime;
      end = offsetLength + (totalLength * end) / totalTime;
      end = Math.min(totalLength, end);

      let bar = document.createElement("div");
      bar.setAttribute("class", "cache-bar");
      bar.style.left = `${start}px`;
      bar.style.width = `${end - start}px`;
      indicator.appendChild(bar);
    }
  }

  windowSize.subscribe(() => {
    if (indicator) update();
  });

  $: if (ranges) update();
</script>

<div class="player-cache" bind:this={indicator} />

<style>
  .player-cache {
    width: 100%;
    height: 3px;
    position: relative;
    top: -15px;
    z-index: -1;
    cursor: default;
  }

  :global(.player-cache .cache-bar) {
    background-color: rgb(138, 207, 168);
    position: absolute;
    height: 3px;
  }
</style>
