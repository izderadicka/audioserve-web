<script lang="ts">
  import { beforeUpdate, afterUpdate, onMount } from "svelte";

  import { apiConfig, selectedCollection } from "../state/stores";
  export let name: string;
  export let path: string;
  export let bgColor = "";
  export let textColor = "white";
  export let size = "64px";
  export let visible = true;
  let borderRadius = "0";

  function getInitials(name: string): string {
    let initials = name
      .split(/[ -,;()\[\]\_]/)
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
  let src: string;

  $: abbr = getInitials(name);
  $: abbrLength = abbr.length;
  $: {
    src = `${$apiConfig.basePath}/${$selectedCollection}/icon/${encodeURI(
      path
    )}`;
    imageFail = false;
    imageLoading = true;
  }

  onMount(() => {});

  beforeUpdate(() => {});

  afterUpdate(() => {});
</script>

<div
  aria-hidden="true"
  class="wrapper"
  style="--borderRadius:{borderRadius}; --size:{size}; --bgColor:{bgColor
    ? bgColor
    : 'var(--icon-background)'};
    --textColor:{textColor}; --abbrLength:{abbrLength}"
>
  {#if src && !imageFail && visible}
    <div class:imageLoading class="imgWrapper">
      <img
        class:loading={imageLoading}
        alt="Folder Icon"
        {src}
        on:error={() => {
          imageFail = true;
          imageLoading = false;
        }}
        on:load={() => {
          imageLoading = false;
          imageFail = false;
        }}
      />
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
  .imageLoading::before {
    content: "↓";
    font-size: var(--size);
    line-height: var(--size);
    text-align: center;
    color: var(--textColor);
    display: block;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
