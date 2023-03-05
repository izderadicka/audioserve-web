<script lang="ts">
  import CircleMinusIcon from "svelte-material-icons/MinusCircleOutline.svelte";
  import MinusIcon from "svelte-material-icons/Minus.svelte";
  import CirclePlusIcon from "svelte-material-icons/PlusCircleOutline.svelte";
  import PlusIcon from "svelte-material-icons/Plus.svelte";

  import { config, sleepTime } from "../state/stores";
  import { onDestroy, onMount } from "svelte";

  export let iconSize = "";

  let time: number = 0;
  $: time_fmt = time && time > 0 ? time.toString() : "";
  let editing = false;
  let input: HTMLInputElement;

  const destroySubscription = sleepTime.subscribe((v) => {
    if (v != time && !editing) time = v;
  });

  const changeSleepTime = () => {
    if (time != $sleepTime && time >= 0) {
      $sleepTime = time;
    } else {
      time = $sleepTime;
    }
  };

  const decreaseSleepTime = (decr: number) => {
    $sleepTime = Math.max($sleepTime - decr, 0);
  };

  onMount(() => {
    time = $sleepTime;
  });

  onDestroy(destroySubscription);
</script>

<div>
  <span
    role="button"
    class="button-like big-minus"
    on:click={() => decreaseSleepTime($config.sleepTimerExtend)}
  >
    <CircleMinusIcon size={iconSize} />
  </span>
  <span role="button" class="button-like" on:click={() => decreaseSleepTime(1)}>
    <MinusIcon size={iconSize} />
  </span>
  <input
    tabindex="0"
    type="number"
    name="timer"
    id="timer"
    min="0"
    max="999"
    aria-label="Timer finer control"
    bind:this={input}
    bind:value={time_fmt}
    on:focus={() => (editing = true)}
    on:blur={() => {
      editing = false;
      changeSleepTime();
    }}
    on:keyup={(evt) => {
      if (evt.key === "Enter") {
        input.blur();
      } else if (evt.key === "Escape") {
        time = $sleepTime;
        input.blur();
      }
    }}
  />
  <span role="button" class="button-like" on:click={() => ($sleepTime += 1)}>
    <PlusIcon size={iconSize} />
  </span>
  <span
    role="button"
    class="button-like big-plus"
    on:click={() => ($sleepTime += $config.sleepTimerExtend)}
  >
    <CirclePlusIcon size={iconSize} />
  </span>
</div>

<style>
  span.big-minus,
  span.big-minus:hover {
    margin-right: 0.33em;
  }

  span.big-plus,
  span.big-plus:hover {
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
    appearance: textfield !important;
  }
</style>
