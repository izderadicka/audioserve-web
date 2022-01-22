<script lang="ts">
  import { createEventDispatcher } from "svelte";
import type { Transcoding } from "../client";
  import { selectedTranscoding, transcodings } from "../state/stores";
import { TranscodingCode, transcodingCodeToName, TranscodingName, transcodingNameToCode } from "../types/enums";
  import { capitalize, otherTheme } from "../util";
  const dispatch = createEventDispatcher();

  let transcodingNames: TranscodingName[] = [];
  
  $: if ($transcodings) {
    transcodingNames = ["None", "Low", "Medium", "High"];
  }

  $: transcoding = transcodingCodeToName($selectedTranscoding);
   
  function updateTranscoding() {
    $selectedTranscoding = transcodingNameToCode(transcoding);
    console.debug('Transcoding changed to ', $selectedTranscoding, transcoding);
  }

  function getBitrate(transcodingName: TranscodingName) {
      if (transcodingName === 'None' || ! $transcodings) {
        return ""
      } else {
        const key = transcodingName.toLocaleLowerCase();
        const transcodingInfo: Transcoding = $transcodings[key];
        return `(${transcodingInfo.bitrate} kbps)`
      }

    }

  let theme: string;

  function menuClick(evt) {
    menuVisible = false;
    const item = evt.target.dataset.menu;
    dispatch("menu", item);
  }

  let menuVisible = false;

  function toggle() {
    if (!menuVisible) {
      theme = capitalize(otherTheme());
    }
    menuVisible = !menuVisible;
  }
</script>

<div class="dropdown">
  <!-- svelte-ignore a11y-invalid-attribute -->
  <a href="#" on:click|preventDefault={toggle} aria-label="Menu"
    ><svg
      aria-hidden="true"
      focusable="false"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      height="1.5rem"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><line x1="3" y1="12" x2="21" y2="12" /><line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
      /><line x1="3" y1="18" x2="21" y2="18" /></svg
    ></a
  >
  <div>
    <aside class="dropdown-content" style={menuVisible ? "" : "display:none"}>
      <nav>
        <!-- svelte-ignore a11y-invalid-attribute -->
        <ul>
          <li>
            <a href="#" data-menu="logout" on:click|preventDefault={menuClick}
              >Logout</a
            >
          </li>
          <li>
            <a
              href="#"
              data-menu="switch-theme"
              on:click|preventDefault={menuClick}>{theme} Theme</a
            >
          </li>
          <li>
            <details open>
              <summary>Transcoding ({transcoding})</summary>
              <ul>
                {#each transcodingNames as transcodingName}
                  <li class="option">
                    <input
                      type="radio"
                      name="transcoding"
                      value={transcodingName}
                      id={"radio-" + transcodingName}
                      bind:group="{transcoding}"
                      on:change="{updateTranscoding}"
                    /><label for={"radio-" + transcodingName}
                      >{transcodingName} {getBitrate(transcodingName)}</label
                    >
                  </li>
                {/each}
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </aside>
  </div>
</div>

<style>
  .option {
    padding-left: 1rem;
    font-size: 75%;
  }
  .dropdown {
    position: relative;
    display: inline-block;
  }

  .dropdown-content {
    position: absolute;
    right: 0;
    background-color: var(--menu-background);
    min-width: 260px;
    box-shadow: 0px 8px 16px 0px var(--menu-shadow);
    z-index: 999;
    padding-left: 1rem;
  }

  .dropdown a {
    background-color: transparent !important;
  }
</style>
