<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  function menuClick(evt) {
    menuVisible = false;
    const item = evt.target.dataset.menu;
    dispatch("menu", item);
  }

  let menuVisible = false;

  function toggle() {
      menuVisible = ! menuVisible;
  }
</script>

<style>
.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-content {
  position: absolute;
  right: 0;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 999;
  padding-left: 1rem;
}

.dropdown a {
    background-color: transparent !important;
}
    
</style>

<div class="dropdown">
<!-- svelte-ignore a11y-invalid-attribute -->
<a href="#" on:click|preventDefault={toggle} aria-label="Menu"
  ><svg
    aria-hidden="true"
    focusable="false"
    role="img"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    height="16px"
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
<aside class="dropdown-content" style="{menuVisible?'':'display:none'}">
  <nav>
    <!-- svelte-ignore a11y-invalid-attribute -->
    <ul>
      <li>
        <a href="#" data-menu="logout" on:click|preventDefault={menuClick}
          >Logout</a
        >
      </li>
      <li>
        <a href="#" data-menu="test1" on:click|preventDefault={menuClick}
          >Test1</a
        >
      </li>
    </ul>
  </nav>
</aside>
</div>
</div>

