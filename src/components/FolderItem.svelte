<script lang="ts">
import { beforeUpdate } from "svelte";

import type { Subfolder } from "../client";
import { splitPath } from "../util";


    export let subfolder: Subfolder;
    export let extended = false;
    export let finished = false;

    let basedir: string|undefined;

    beforeUpdate(() => {
        basedir =splitPath(subfolder.path).folder;
    })
</script>

<div>
    <h4 class="title" class:finished={finished}>{subfolder.name}</h4>
    {#if extended && basedir}
    <h6 class="subtitle">{basedir}</h6>
    {/if}
</div>

<style>
    .title {
        margin-bottom: 0.15rem;
    }

    .finished {
        font-style: italic;

    }

    .finished::after {
    content: " ✓";
    color: var(--secondary);
    }

    .subtitle {
        font-style: italic;
        margin-left: 1rem;
        font-weight: normal;
        margin-bottom: 0.1rem;
    }

</style>