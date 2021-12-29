<script lang="ts">
  import "@picocss/pico";
  import Login from "./components/Login.svelte";
  import Menu from "./components/Menu.svelte";

  import { apiConfig, colApi, isAuthenticated } from "./state/stores";
  import { onMount } from "svelte";
  import { CollectionsApi, Configuration } from "./client";
import { deleteCookie } from "./util/auth";

  const API_BASE_URL = "http://localhost:3000";
  apiConfig.set(
    new Configuration({
      basePath: API_BASE_URL,
      credentials: "include",
    })
  );

  async function loadCollections() {
    const collections = await $colApi.collectionsGet();
    console.debug("Got collections list", collections);
    const transcodings = await $colApi.transcodingsGet();
    console.debug("Got transcodings list", transcodings);
  }

  function actOnMenu(menuEvt) {
	  const menuSelection: string = menuEvt.detail;
	  console.debug("Menu selected", menuSelection);

	  if (menuSelection === "logout") {
		  $isAuthenticated = false;
		  deleteCookie();
	  }
  }

  onMount(async () => {
    try {
      await loadCollections();
    } catch (e) {
      console.error("Error loading initial lists", typeof e, e);
      $isAuthenticated = false;
      // try to load again after authentication
      const unsubsribe = isAuthenticated.subscribe(async (ok) => {
        if (ok) {
          await loadCollections();
        }
      });
    }
  });
</script>

<main class="container">
  {#if !$isAuthenticated}
    <Login />
  {:else}
    <nav class="nav-bar">
      <ul>
        <li><h4><a href="/">audioserve</a></h4></li>
      </ul>
	  <ul>
        <li><Menu on:menu="{actOnMenu}"/></li>
      </ul>
    </nav>
	<div class="searchbar">
		
	</div>
    <div class="browser">
      <div class="breadcrumb">[home/neco/neco]</div>
      <div class="browser" />
    </div>
    <div class="player">[player]</div>
  {/if}
</main>

<style>
</style>
