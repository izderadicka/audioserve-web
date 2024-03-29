<script lang="ts">
    import { playList } from "../state/stores";
    import type { AudioFileExt } from "../types/types";
    import { splitExtInName } from "../util";
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
    let selectedItemName: string;
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
        selectedItemName = splitExtInName(item).baseName;
        selectedItemIndex = itemIndex;
        selectedTime = position;
        selectedFormattedPosition = formatTime(selectedTime);
    }

    function onConfirm() {
        dispatch("jump", { selectedItem, selectedTime, selectedItemIndex });
    }

    enum EnterAction {
        Next,
        Confirm,
    }

    let clockInputs: HTMLDivElement;

    function focusNextInput() {
        const inputs = clockInputs.querySelectorAll("input");
        const currentInput = document.activeElement as HTMLInputElement;
        const currentIndex = Array.from(inputs).indexOf(currentInput);
        const nextIndex = currentIndex + 1;

        if (nextIndex < inputs.length) {
            const nextInput = inputs[nextIndex];
            nextInput.focus();
        }
    }

    function onEnter(action: EnterAction) {
        return (evt: KeyboardEvent) => {
            if (evt.key === "Enter") {
                evt.preventDefault();
                switch (action) {
                    case EnterAction.Next: {
                        // focus next
                        focusNextInput();
                        break;
                    }
                    case EnterAction.Confirm: {
                        dialog.toggleModal();
                        onConfirm();
                        break;
                    }
                }
            }
        };
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
        <div class="clock" bind:this={clockInputs}>
            <input
                enterkeyhint="next"
                type="number"
                name="hour"
                bind:value={hour}
                on:keydown={onEnter(EnterAction.Next)}
                class="small"
            />:
            <input
                enterkeyhint="next"
                type="number"
                name="minute"
                bind:value={minute}
                on:keydown={onEnter(EnterAction.Next)}
                class="small"
            />:
            <input
                enterkeyhint="go"
                type="number"
                name="second"
                bind:value={second}
                on:keydown={onEnter(EnterAction.Confirm)}
                class="small"
            />
        </div>
        {#if selectedItem}
            <div class="row">
                <div class="label">Navigates to this file:</div>
                <div>{selectedItemName}</div>
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
