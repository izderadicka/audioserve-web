<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import { get } from "svelte/store";

  import { config } from "../state/stores";
  import { StorageKeys } from "../types/enums";
  import type { AppConfig } from "../types/types";
  import ClosableTitle from "./ClosableTitle.svelte";

  let currentConfig: AppConfig = get(config);

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
    <label for="cache-ahead">Files to Cache Ahead</label>
    <input
      id="cache-ahead"
      type="number"
      bind:value={currentConfig.cacheAheadFiles}
    />
    <p>
      When you start to play file following n files will be loaded to cache on
      background
    </p>

    <label for="jump-fwd">Short Jump Forward (secs]</label>
    <input
      id="jump-fwd"
      type="number"
      bind:value={currentConfig.jumpForwardTime}
    />
    <p>
      Time for short foward jump (arc arrow icon right from play/pause button)
    </p>

    <label for="jump-back">Short Jump Backward (secs]</label>
    <input
      id="jump-back"
      type="number"
      bind:value={currentConfig.jumpBackTime}
    />
    <p>
      Time for short backward jump (arc arrow icon left from play/pause button)
    </p>

    <label for="autorewind">
      <input
        id="autorewind"
        type="checkbox"
        bind:checked={currentConfig.autorewind}
      />
      Automatically rewind on playback start
    </label>
    <p class="no-input">
      When you click on Play button current position will be be moved back
      slightly to better catch up with previous text
    </p>

    <label for="sleep-time">Sleep Timer (minutes)</label>
    <input
      id="sleep-time"
      type="number"
      bind:value={currentConfig.sleepTimerPeriod}
    />
    <p>
      When you click sleep timer icon, n minutes is waited and then playback is
      paused
    </p>

    <label for="sleep-time-extend">Sleep Timer Extension (minutes)</label>
    <input
      id="sleep-time-extend"
      type="number"
      bind:value={currentConfig.sleepTimerExtend}
    />
    <p>
      One minute before Sleep Timer finishes (notified by sound) you can extend
      it by n minutes by shaking device
    </p>

    <label for="recent-days">Maximum history for recently listened (days)</label
    >
    <input
      id="recent-days"
      type="number"
      bind:value={currentConfig.recentDays}
    />
    <p>
      When showing recently listened files from menu only records newer then
      given number of days are fetched from server. Put zero to fetch all
      available records.
    </p>

    <label for="pos-reporting">Playback Position Reporting Period (secs)</label>
    <input
      id="pos-reporting"
      type="number"
      bind:value={currentConfig.positionReportingPeriod}
    />
    <p>
      When file is being played, playback position is reported every n seconds
      to server
    </p>

    <label for="trans-tolerance">Transcoding Tolerance Coeficient</label>
    <input
      id="trans-tolerance"
      type="number"
      bind:value={currentConfig.transcodingTolerance}
    />
    <p>
      If file bitrate is only by x bigger then transcoding limit, transcoding is
      not used
    </p>

    <label for="trans-jump">Transcoding Seek Limit (secs)</label>
    <input
      id="trans-jump"
      type="number"
      bind:value={currentConfig.transcodingJumpLimit}
    />
    <p>
      If you seek ahead on transcoded file in player (indicated by squaze icon)
      and jump is bigger theh this limit, then if not already buffred seek will
      be done on server (which is fast), rather then waiting for intermediate
      date to load
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
