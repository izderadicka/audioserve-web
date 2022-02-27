<script lang="ts">
import { onMount } from "svelte";


  export let offset = 0;
  export let totalTime = 0;
  export let ranges: {start: number, end: number}[];

  let indicator: HTMLDivElement;
  let bar: HTMLDivElement;
  let svelteBarClass = "";

  onMount(() => {
      svelteBarClass = Array.from(bar.classList).filter(c => c.includes('svelte-'))[0];
  })

  function update() {
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
      bar.setAttribute("class", "cache-bar "+ svelteBarClass);
      bar.style.left = `${start}px`;
      bar.style.width = `${end - start}px`;
      indicator.appendChild(bar);
    }
  }

  $: if (ranges) update()
</script>

<div class="player-cache" bind:this={indicator}>
  <div bind:this="{bar}" class="cache-bar" style="width: 50%;" />
</div>

<style>
  .player-cache {
    width: 100%;
    height: 3px;
    position: relative;
    top: -15px;
    z-index: -1;
    cursor: default;
  }

  /* @ts-ignore */
  .cache-bar {
    background-color: rgb(138, 207, 168);
    position: absolute;
    height: 3px;
  }
</style>
