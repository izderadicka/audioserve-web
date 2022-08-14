<script lang="ts">
  import { beforeUpdate, afterUpdate, onMount } from "svelte";

  import { apiConfig, selectedCollection } from "../state/stores";
  export let name: string;
  export let path: string;
  export let bgColor = "";
  export let textColor = "white";
  export let size = "64px";
  let borderRadius = "0";
  export let randomBgColor = false;

  function getRandomColor() {
    const colors = [
      "#F44336",
      "#E91E63",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#03A9F4",
      "#00BCD4",
      "#009688",
      "#4CAF50",
      "#FFEB3B",
      "#FFC107",
      "#FF5722",
      "#795548",
    ];
    const i = Math.floor(Math.random() * colors.length);
    return colors[i];
  }

  function getInitials(name: string): string {
    const initials = name
      .split(" ")
      .slice(0, 2)
      .map((w) => w.substring(0, 1).toUpperCase());
    return initials.join("");
  }

  const background = randomBgColor ? getRandomColor() : bgColor;

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
  style="--borderRadius:{borderRadius}; --size:{size}; --bgColor:{background
    ? background
    : 'var(--icon-background)'};
    --textColor:{textColor}; --abbrLength:{abbrLength}"
>
  {#if src && !imageFail}
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
