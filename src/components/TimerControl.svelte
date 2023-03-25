<script context="module" lang="ts">
  import { derived } from "svelte/store";
  import { sleepTime } from "../state/stores";
  import type { Readable } from "svelte/store";
  let emptySleepTime: Readable<number | ""> = derived(sleepTime, (t) =>
    t === 0 ? "" : t
  );
</script>

<script lang="ts">
  import CircleMinusIcon from "svelte-material-icons/MinusCircleOutline.svelte";
  import MinusIcon from "svelte-material-icons/Minus.svelte";
  import CirclePlusIcon from "svelte-material-icons/PlusCircleOutline.svelte";
  import PlusIcon from "svelte-material-icons/Plus.svelte";
  import SleepCancelIcon from "svelte-material-icons/AlarmOff.svelte";

  import { config } from "../state/stores";
  import { onDestroy, onMount } from "svelte";

  export let iconSize = "";

  let time: number | "" = "";
  let editing = false;
  let input: HTMLInputElement;

  const destroySubscription = emptySleepTime.subscribe((v) => {
    if (v != time && !editing) time = v;
  });

  const changeSleepTime = () => {
    if (time === "") {
      $sleepTime = 0;
    } else if (time != $sleepTime && time >= 0) {
      $sleepTime = time;
    } else {
      time = $sleepTime;
    }
  };

  const decreaseSleepTime = (decr: number) => {
    $sleepTime = Math.max($sleepTime - decr, 0);
  };

  const maskInput = (evt) => {
    const target = evt.target as HTMLInputElement;
    const masked = target.value.replace(/\D/g, ""); //.replace(/^0+/, "");
    time = parseInt(masked) || "";
  };

  onMount(() => {
    time = $emptySleepTime;
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
    bind:value={time}
    on:focus={() => (editing = true)}
    on:blur={() => {
      editing = false;
      changeSleepTime();
    }}
    on:input={maskInput}
    on:keyup={(evt) => {
      if (evt.key === "Enter") {
        input.blur();
      } else if (evt.key === "Escape") {
        time = $emptySleepTime;
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

  {#if $sleepTime > 0}
    <span
      role="button"
      class="button-like cancel-sleep "
      on:click={() => ($sleepTime = 0)}
    >
      <SleepCancelIcon size={iconSize} />
    </span>
  {/if}
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

  span.cancel-sleep,
  span.cancel-sleep:hover {
    margin-left: 1.33em;
  }

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input {
    width: 4em !important;
    line-height: 1em;
    height: 1.4em !important;
    display: inline-block;
    padding: 0.1em 0.5em;
    margin: 0;
    -moz-appearance: textfield !important;
    appearance: textfield !important;
  }
</style>
