<script lang="ts">
  import CircleMinusIcon from "svelte-material-icons/MinusCircleOutline.svelte";
  import MinusIcon from "svelte-material-icons/Minus.svelte";
  import CirclePlusIcon from "svelte-material-icons/PlusCircleOutline.svelte";
  import PlusIcon from "svelte-material-icons/Plus.svelte";

  import { config, sleepTime } from "../state/stores";

  export let iconSize = "";
</script>

<div>
  <span
    role="button"
    class="button-like"
    on:click={() =>
      ($sleepTime =
        $sleepTime - Math.min($sleepTime - 1, $config.sleepTimerExtend))}
  >
    <CircleMinusIcon size={iconSize} />
  </span>
  <span
    role="button"
    class="button-like"
    on:click={() => ($sleepTime = $sleepTime - Math.min($sleepTime - 1, 1))}
  >
    <MinusIcon size={iconSize} />
  </span>
  <input
    tabindex="0"
    type="number"
    name="timer"
    id="timer"
    min="0"
    max="999"
    aria-label="Timer"
    bind:value={$sleepTime}
  />
  <span role="button" class="button-like" on:click={() => ($sleepTime += 1)}>
    <PlusIcon size={iconSize} />
  </span>
  <span
    role="button"
    class="button-like"
    on:click={() => ($sleepTime += $config.sleepTimerExtend)}
  >
    <CirclePlusIcon size={iconSize} />
  </span>
</div>

<style>
  span {
    margin-left: 0.33em;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input {
    width: 4em !important;
    line-height: 1em;
    height: 1.2em !important;
    display: inline-block;
    padding: 0;
    margin: 0;
    -moz-appearance: textfield !important;
  }
</style>
