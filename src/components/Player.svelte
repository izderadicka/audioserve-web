<script lang="ts">
import { onDestroy } from "svelte";

import { playItem } from "../state/stores";

import { formatTime } from "../util";

    let duration:number;
    $: formattedDuration = formatTime(duration);
    let currentTime:number;
    $: formattedCurrentTime = formatTime(currentTime);
    let paused: boolean;

    let player: HTMLAudioElement; 

    let file = "";
    let folder = "";

    const unsubscribe = playItem.subscribe((item) => {
        if (item) {
            player.src = item.url;
            player.play();
            file = item.name
        }
    });

    function playPause() {
        if (paused) {
            player.play();
        } else {
            player.pause();
        }
    }

    onDestroy(unsubscribe);

</script>
<div class="info">
    <div>
        <label for="file-name">File (<span>X</span>/<span>Y</span>): </label>
        <span id="file-name">{file}</span>
        <button id="prev-file">▲</button>
        <button id="next-file">▼</button>
    </div>
    <div>
        <label for="folder-name">Folder: </label>
        <span id="folder-name">{folder}</span>
    </div>
</div>
<div class="player">
    <audio bind:duration bind:currentTime bind:paused bind:this="{player}"></audio>
    <div class="play-btn">
        <button on:click="{playPause}">
            
            <svg id="play-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="24" viewBox="0 0 18 24">
                {#if paused}
                <path fill="#566574" fill-rule="evenodd" 
                d="M18 12L0 24V0" />
                {:else}
                <path fill="#566574" fill-rule="evenodd" 
                d="M0 0h6v24H0zM12 0h6v24h-6z" />
                {/if}
              </svg>
            
        </button>
    </div>
    <div class="play-time">
        {formattedCurrentTime}
    </div>
    <div class="progress">
        <input type="range" id="playback-progress">
    </div>
    <div class="total-time">
        {formattedDuration}
    </div>
</div>

<style>
    #play-icon path{
        fill: var(--primary);
    }
    .progress {
        flex-grow: 1;
        margin-left: 1rem;
        padding-top: 1.2rem;
    }
    .total-time {
        margin-left: 1rem;
    }
    .play-time {
        margin-left: 1rem;
        width: 4rem;
        text-align: end;
    }
    .player {
        display:flex;
        flex-flow: row;
        align-items: center;
    }
    button {
        all:initial;
        cursor: pointer;
        color: var(--primary);
    }
    .play-btn button{
        font-size: 32px;
    }
    label {
        display: inline;
        font-weight: bold;
    }
    .info {
        margin-top: 0.5em;
    }
</style>