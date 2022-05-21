<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<!-- svelte-ignore a11y-missing-content -->
<h2>
  <span><slot /></span>
  <a href="#close" class="close" on:click|preventDefault={close} />
</h2>

<style>
  h2 {
    display: flex;
    align-items: center;
  }
  .close {
    display: inline-block;
    --close-size: 2rem;
    width: var(--close-size);
    height: var(--close-size);
    margin-left: auto;
    background-image: var(--icon-close);
    background-position: center;
    background-size: auto var(--close-size);
    background-repeat: no-repeat;
    opacity: 0.5;
    transition: opacity var(--transition);
  }

  .close:hover {
    opacity: 1;
  }
</style>
