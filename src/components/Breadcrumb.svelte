<script type="ts">
import { currentFolder } from "../state/stores";

$: pathSegments = $currentFolder?.split('/') || [];

function goHome() {
    $currentFolder = "";
}

function changeFolder(idx:number) {
    return () => {
        const path = pathSegments.slice(0, idx + 1).join('/');
        $currentFolder = path;
    }
}

</script>

<style>
    .breadcrumb {
        padding: 0.5rem;
        background-color: var(--primary-focus);
        margin-bottom: 1.5rem;
    }
</style>

<div class="breadcrumb">
    <a href="/" on:click|preventDefault="{goHome}">Home</a>
    {#each pathSegments as seg,idx}
    <!-- svelte-ignore a11y-invalid-attribute -->
    / <a href="#" on:click|preventDefault="{changeFolder(idx)}">{seg} </a>
    {/each}
</div>