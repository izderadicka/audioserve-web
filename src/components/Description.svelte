<script lang="ts">
  import { afterUpdate, beforeUpdate, onMount } from "svelte";
  import { colApi, selectedCollection } from "../state/stores";
  import showdown from "showdown";

  export let descriptionPath: string;
  let elem: HTMLDivElement;

  const loadDescription = async (path: string) => {
    if (!path || !elem) return;
    elem.innerHTML = "";

    const resp = await $colApi.colIdDescPathGetRaw({
      colId: $selectedCollection,
      path,
    });
    const mime = resp.raw.headers.get("Content-Type");
    const text = await resp.value();
    if (mime == "text/html") {
      elem.innerHTML = text;
    } else if (mime == "text/x-markdown" || mime == "text/markdown") {
      let converter = new showdown.Converter();
      elem.innerHTML = converter.makeHtml(text);
    } else if (mime == "text/plain") {
      const lines = text.split(/\r?\n/);
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const para = document.createElement("p");
        para.innerText = line;
        elem.appendChild(para);
      }
    } else {
      console.error(`Unsupported content type ${mime} for description`);
    }
  };

  onMount(() => loadDescription(descriptionPath));
  $: loadDescription(descriptionPath);
</script>

<div bind:this={elem} />
