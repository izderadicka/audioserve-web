<script lang="ts">
import { beforeUpdate } from "svelte";

import type { Subfolder } from "../client";
import { splitPath } from "../util";


    export let subfolder: Subfolder;
    export let extended = false;

    let basedir: string|undefined;

    beforeUpdate(() => {
        basedir =splitPath(subfolder.path).folder;
    })
</script>

<div>
    <div>{subfolder.name}</div>
    {#if extended && basedir}
    <h6 class="subtitle">{basedir}</h6>
    {/if}
</div>

<style>
    .subtitle {
        font-size: 0.8rem;
        font-style: italic;
        margin-left: 1rem;
        font-weight: normal;
        margin-bottom: 0.3rem;
    }

</style>