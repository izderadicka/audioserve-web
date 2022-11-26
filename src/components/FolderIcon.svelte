<script lang="ts">
  import { apiConfig, selectedCollection } from "../state/stores";
  export let name: string;
  export let path: string;
  export let bgColor = "";
  export let textColor = "white";
  export let size = "64px";
  export let visible = true;
  let borderRadius = "0";

  let image: HTMLImageElement;

  let pendingRequest: AbortController | null;

  async function loadImage(path: string) {
    imageFail = false;
    imageLoading = true;
    const url = `${
      $apiConfig.basePath
    }/${$selectedCollection}/icon/${encodeURIComponent(path)}`;
    pendingRequest = new AbortController();
    try {
      const resp = await fetch(url, {
        signal: pendingRequest.signal,
        credentials: "include",
        mode: "cors",
      });
      if (resp.status === 200) {
        const data = await resp.blob();
        const imgUrl = URL.createObjectURL(data);
        imageFail = false;
        if (image) {
          image.src = imgUrl;
        }
      } else {
        imageFail = true;
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(`Failed to load icon for ${path}`, e);
      } else {
        console.debug("icon request aborted");
      }
      imageFail = true;
    } finally {
      pendingRequest = null;
      imageLoading = false;
      loadedPath = path;
    }
  }

  function getInitials(name: string): string {
    let initials = name
      .split(/[ \-,;()\[\]\_]/)
      .filter((x) => x.length > 0)
      .slice(0, 2);
    if (initials.length === 0) {
      return "?";
    } else if (/^\d+$/.test(initials[0])) {
      return initials[0].slice(-2);
    }
    initials = initials.map((w) => w.substring(0, 1).toUpperCase());
    return initials.join("");
  }

  let abbr: string;
  let abbrLength: number;
  let imageFail = false;
  let imageLoading = false;
  let loadedPath: String | null;

  $: abbr = getInitials(name);
  $: abbrLength = abbr.length;
  $: {
    if (visible) {
      if (!imageLoading && path !== loadedPath) loadImage(path);
    } else {
      if (pendingRequest) {
        pendingRequest.abort("Out of view");
      }
      loadedPath = null;
    }
  }
</script>

<div
  aria-hidden="true"
  class="wrapper"
  style="--borderRadius:{borderRadius}; --size:{size}; --bgColor:{bgColor
    ? bgColor
    : 'var(--icon-background)'};
    --textColor:{textColor}; --abbrLength:{abbrLength}"
>
  {#if !imageFail && visible}
    <div class:imageLoading class="imgWrapper">
      <img bind:this={image} class:loading={imageLoading} alt="Folder Icon" />
    </div>
  {:else}
    <div class="innerInitials">{abbr}</div>
  {/if}
</div>

<style>
  img {
    height: 100%;
    width: var(--size);
    object-fit: contain;
    margin-left: auto;
    margin-right: auto;
    display: block;
  }

  img.loading {
    display: none;
  }

  .wrapper {
    position: relative;
    width: var(--size);
    height: var(--size);
  }

  .imgWrapper,
  .innerInitials,
  .imageLoading {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: var(--borderRadius);
  }

  .innerInitials {
    line-height: var(--size);
    background-color: var(--bgColor);
    color: var(--textColor);
    text-align: center;
    font-size: calc(var(--size) / (var(--abbrLength) + 0.5));
  }

  .imageLoading {
    background-color: var(--bgColor);
  }
</style>
