<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  function menuClick(evt) {
    const item = evt.target.dataset.menu;
    dispatch("menu", item)
  }
</script>

<aside>
  <nav>
    <!-- svelte-ignore a11y-invalid-attribute -->
    <ul>
      <li>
        <a href="#" data-menu="logout" on:click|preventDefault={menuClick}>Logout</a>
      </li>
      <li>
        <a href="#" data-menu="test1" on:click|preventDefault={menuClick}>Test1</a>
      </li>
    </ul>
  </nav>
</aside>
