<script lang="ts">
  import "@picocss/pico";
  import Login from "./components/Login.svelte";
  import Menu from "./components/Menu.svelte";

  import { apiConfig, colApi, isAuthenticated , collections, transcodings, selectedCollection} from "./state/stores";
  import { onMount } from "svelte";
  import { CollectionsApi, Configuration } from "./client";
import { deleteCookie } from "./util/auth";
import CollectionSelector from "./components/CollectionSelector.svelte";
import Browser from "./components/Browser.svelte";
import { StorageKeys } from "./types/enums";
import Breadcrumb from "./components/Breadcrumb.svelte";

  const API_BASE_URL = "http://localhost:3000";
  apiConfig.set(
    new Configuration({
      basePath: API_BASE_URL,
      credentials: "include",
    })
  );

  async function loadCollections() {
    const cols = await $colApi.collectionsGet();
    console.debug("Got collections list", cols);
	$collections = cols;
	let pastCollection:number = parseInt(localStorage.getItem(StorageKeys.LAST_COLLECTION) || "0");
	if (pastCollection >= cols.names.length) pastCollection=0;
	$selectedCollection = pastCollection;
    const trans = await $colApi.transcodingsGet();
    console.debug("Got transcodings list", trans);
	$transcodings = trans;
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

$: console.debug("Selected collection is "+ $selectedCollection);
</script>

<style>
</style>

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
		<CollectionSelector/>
	</div>
    <div class="browser">
      <Breadcrumb/>
      <div class="browser" />
	  <Browser/>
    </div>
    <div class="player">[player]</div>
  {/if}
</main>
