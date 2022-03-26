<script lang="ts">
import { createEventDispatcher } from "svelte";

  import { get } from "svelte/store";

  import { config } from "../state/stores";
import { StorageKeys } from "../types/enums";
  import type { AppConfig } from "../types/types";

  let currentConfig: AppConfig = get(config);

  const dispatch = createEventDispatcher();

  const applyConfig = () => {
      dispatch("finished");
      localStorage.setItem(StorageKeys.PREFERENCES, JSON.stringify(currentConfig));
      config.set(currentConfig);
  };
  const cancel = () => {
    dispatch("finished");
  };
</script>

<div id="config-editor">
  <h2>Audioserve Preferences</h2>
  <form>
    <label for="cache-ahead">Files to Cache Ahead</label>
    <input
      id="cache-ahead"
      type="number"
      bind:value={currentConfig.cacheAheadFiles}
    />
    <p>When you start to play file following n files will be loaded to cache on background</p>

    <label for="sleep-time">Sleep Timer (minutes)</label>
    <input
      id="sleep-time"
      type="number"
      bind:value={currentConfig.sleepTimerPeriod}
    />
    <p>When you click sleep timer icon, n minutes is waited and then playback is paused </p>

    <label for="sleep-time-extend">Sleep Timer Extension (minutes)</label>
    <input
      id="sleep-time-extend"
      type="number"
      bind:value={currentConfig.sleepTimerExtend}
    />
    <p>One minute before Sleep Timer finishes (notified by sound) you can extend it by n minutes by shaking device</p>

    <label for="pos-reporting">Playback Position Reporting Period (secs)</label>
    <input
      id="pos-reporting"
      type="number"
      bind:value={currentConfig.positionReportingPeriod}
    />
    <p>When file is being played, playback position is reported every n seconds to server</p>

    <label for="trans-tolerance">Transcoding Tolerance Coeficient</label>
    <input
      id="trans-tolerance"
      type="number"
      bind:value={currentConfig.transcodingTolerance}
    />
    <p>If file bitrate is only by x bigger then transcoding limit, transcoding is not used</p>

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
</style>
