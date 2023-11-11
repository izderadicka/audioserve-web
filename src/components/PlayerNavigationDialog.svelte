<script lang="ts">
    import { playList } from "../state/stores";
    import type { AudioFileExt } from "../types/types";
    import { formatTime } from "../util/date";
    import ConfirmDialog from "./ConfirmDialog.svelte";
    import { createEventDispatcher } from "svelte";

    // Create an event dispatcher
    const dispatch = createEventDispatcher();

    let dialog: ConfirmDialog;
    export let maxTime: number;
    export function open(withTime?: number) {
        convertToClock(withTime);
        dialog.toggleModal();
    }

    let hour: number = 0;
    let minute: number = 0;
    let second: number = 0;

    // function to convert seconds to hour, minute, second
    function convertToClock(time: number) {
        hour = Math.floor(time / 3600);
        minute = Math.floor((time - hour * 3600) / 60);
        second = Math.floor(time - hour * 3600 - minute * 60);
    }

    function durationToPlaylistItem(duration: number): {
        item: AudioFileExt;
        itemIndex: number;
        position: number;
    } {
        let item: AudioFileExt;
        let totalPosition: number = 0;
        let idx: number = 0;
        for (idx = 0; idx < $playList.files.length; idx++) {
            let item = $playList.files[idx];
            if (totalPosition + item.meta.duration >= duration) {
                const position = duration - totalPosition;
                return { item, itemIndex: idx, position };
            } else {
                totalPosition += item.meta.duration;
            }
        }
        return { item, itemIndex: idx, position: item.meta.duration };
    }

    let selectedItem: AudioFileExt;
    let selectedItemIndex: number;
    let selectedTime: number;
    let selectedFormattedPosition: string;
    let selectedDuration: number;

    $: if (minute > 59) {
        hour++;
        minute = 0;
    }
    $: if (second > 59) {
        minute++;
        second = 0;
    }

    $: if (minute < 0) {
        hour--;
        minute = 59;
    }
    $: if (second < 0) {
        minute--;
        second = 59;
    }

    $: if (hour < 0) {
        hour = 0;
    }

    $: {
        selectedDuration = hour * 3600 + minute * 60 + second;

        if (selectedDuration > maxTime) {
            selectedDuration = maxTime;
            convertToClock(maxTime);
        }

        let { item, itemIndex, position } =
            durationToPlaylistItem(selectedDuration);
        selectedItem = item;
        selectedItemIndex = itemIndex;
        selectedTime = position;
        selectedFormattedPosition = formatTime(selectedTime);
    }

    function onConfirm() {
        dispatch("jump", { selectedItem, selectedTime, selectedItemIndex });
    }
</script>

<ConfirmDialog
    id="player-navigation-dialog"
    bind:this={dialog}
    confirmName="Go"
    confirmAction={onConfirm}
>
    <div slot="header">Global Navigation</div>
    <div slot="body">
        <div class="label">Global position:</div>
        <div class="clock">
            <input type="number" name="hour" bind:value={hour} class="small" />:
            <input
                type="number"
                name="minute"
                bind:value={minute}
                class="small"
            />:
            <input
                type="number"
                name="second"
                bind:value={second}
                class="small"
            />
        </div>
        {#if selectedItem}
            <div class="row">
                <div class="label">Navigates to this file:</div>
                <div>{selectedItem.name}</div>
            </div>
            <div class="row">
                <div class="label">And position in file:</div>
                <div>{selectedFormattedPosition}</div>
            </div>
        {/if}
    </div>
</ConfirmDialog>

<style>
    .label {
        font-weight: bold;
    }
    .small {
        width: 3.5em;
        padding: 0.5em;
        height: 2em;
        margin-right: 0.5em;
    }
    .clock {
        font-size: 2em;
    }
    .row {
        margin-bottom: 0.5em;
    }
</style>
