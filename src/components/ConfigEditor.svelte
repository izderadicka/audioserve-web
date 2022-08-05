<script lang="ts">
  import { createEventDispatcher, getContext } from "svelte";

  import { get } from "svelte/store";

  import { config } from "../state/stores";
  import { StorageKeys } from "../types/enums";
  import type { AppConfig } from "../types/types";
  import ClosableTitle from "./ClosableTitle.svelte";

  let currentConfig: AppConfig = get(config);
  let cache = getContext("cache");

  const dispatch = createEventDispatcher();

  const applyConfig = () => {
    dispatch("finished");
    localStorage.setItem(
      StorageKeys.PREFERENCES,
      JSON.stringify(currentConfig)
    );
    config.set(currentConfig);
  };
  const cancel = () => {
    dispatch("finished");
  };
</script>

<div id="config-editor">
  <ClosableTitle on:close={cancel}>Audioserve Preferences</ClosableTitle>
  <form>
    {#if cache}
      <label for="cache-ahead">Files to Cache Ahead</label>
      <input
        id="cache-ahead"
        aria-describedby="cache-ahead-desc"
        type="number"
        bind:value={currentConfig.cacheAheadFiles}
      />
      <p id="cache-ahead-desc">
        When you start to play file next n files will be loaded to cache on
        background
      </p>

      <label for="cache-ahead-delay"
        >Delay before start caching next files (secs)</label
      >
      <input
        id="cache-ahead-delay"
        aria-describedby="cache-ahead-delay-desc"
        type="number"
        bind:value={currentConfig.cacheAheadDelay}
      />
      <p id="cache-ahead-delay-desc">
        Wait n seconds after playback start before starting to cache next files
        (for small files it's half of their duration).
      </p>
    {/if}
    <label for="jump-fwd">Short Jump Forward (secs)</label>
    <input
      id="jump-fwd"
      aria-describedby="jump-fwd-desc"
      type="number"
      bind:value={currentConfig.jumpForwardTime}
    />
    <p id="jump-fwd-desc">
      Time for short foward jump (arc arrow icon right from play/pause button)
    </p>

    <label for="jump-back">Short Jump Backward (secs)</label>
    <input
      id="jump-back"
      aria-describedby="jump-back-desc"
      type="number"
      bind:value={currentConfig.jumpBackTime}
    />
    <p id="jump-back-desc">
      Time for short backward jump (arc arrow icon left from play/pause button)
    </p>

    <label for="autorewind">
      <input
        id="autorewind"
        aria-describedby="autorewind-desc"
        type="checkbox"
        bind:checked={currentConfig.autorewind}
      />
      Automatically rewind on playback start
    </label>
    <p class="no-input" id="autorewind-desc">
      When you click on Play button current position will be be moved back
      slightly to better catch up with previous text
    </p>

    <label for="sleep-time">Sleep Timer (minutes)</label>
    <input
      id="sleep-time"
      aria-describedby="sleep-time-desc"
      type="number"
      bind:value={currentConfig.sleepTimerPeriod}
    />
    <p id="sleep-time-desc">
      When you click sleep timer icon, n minutes is waited and then playback is
      paused
    </p>

    <label for="sleep-time-extend">Sleep Timer Extension (minutes)</label>
    <input
      id="sleep-time-extend"
      aria-describedby="sleep-time-extend-desc"
      type="number"
      bind:value={currentConfig.sleepTimerExtend}
    />
    <p id="sleep-time-extend-desc">
      One minute before Sleep Timer finishes (notified by sound) you can extend
      it by n minutes by shaking device
    </p>

    <label for="recent-days">Maximum history for recently listened (days)</label
    >
    <input
      id="recent-days"
      aria-describedby="recent-days-desc"
      type="number"
      bind:value={currentConfig.recentDays}
    />
    <p id="recent-days-desc">
      When showing recently listened files from menu only records newer then
      given number of days are fetched from server. Put zero to fetch all
      available records.
    </p>

    <label for="pos-reporting">Playback Position Reporting Period (secs)</label>
    <input
      id="pos-reporting"
      aria-describedby="pos-reporting-desc"
      type="number"
      bind:value={currentConfig.positionReportingPeriod}
    />
    <p id="pos-reporting-desc">
      When file is being played, playback position is reported every n seconds
      to server
    </p>

    <label for="trans-tolerance">Transcoding Tolerance Coeficient</label>
    <input
      id="trans-tolerance"
      aria-describedby="trans-tolerance-desc"
      type="number"
      bind:value={currentConfig.transcodingTolerance}
    />
    <p id="trans-tolerance-desc">
      If file bitrate is only by x bigger then transcoding limit, transcoding is
      not used
    </p>

    <label for="trans-jump">Transcoding Seek Limit (secs)</label>
    <input
      id="trans-jump"
      aria-describedby="trans-jump-desc"
      type="number"
      bind:value={currentConfig.transcodingJumpLimit}
    />
    <p id="trans-jump-desc">
      If you seek ahead on transcoded file in player (indicated by squaze icon)
      and jump is bigger theh this limit, then if not already buffred seek will
      be done on server (which is fast), rather then waiting for intermediate
      data to load
    </p>

    <label for="always-transcode">Mime types to always transcode</label>
    <input
      id="always-transcode"
      aria-describedby="always-transcode-desc"
      type="text"
      bind:value={currentConfig.alwaysTranscode}
    />
    <p id="always-transcode-desc">
      List audio Mime types (space separated), that you want always to transcode
      - e.g. they are not supported by browser on this platform. Typical example
      would be audio/ogg on iPhone/iPad
    </p>

    <div class="grid">
      <button class="secondary" on:click|preventDefault={cancel}>Cancel</button>
      <button on:click|preventDefault={applyConfig}>Apply</button>
    </div>
  </form>
</div>

<style>
  #config-editor {
    padding: 1rem;
  }

  label {
    font-weight: bold;
  }

  p {
    font-size: 0.75rem;
    font-style: italic;
    margin-top: -0.5rem;
  }

  p.no-input {
    margin-top: 0.5rem;
  }
</style>
