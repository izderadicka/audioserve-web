<script lang="ts">
  import "@picocss/pico";
  import Login from "./components/Login.svelte";
  import Menu from "./components/Menu.svelte";

  import {
    apiConfig,
    colApi,
    isAuthenticated,
    collections,
    transcodings,
    selectedCollection,
config,
currentFolder,
  } from "./state/stores";
  import { onMount, setContext } from "svelte";
  import { CollectionsApi, Configuration } from "./client";
  import { deleteCookie } from "./util/auth";
  import CollectionSelector from "./components/CollectionSelector.svelte";
  import Browser from "./components/Browser.svelte";
  import { FolderType, StorageKeys } from "./types/enums";
  import Breadcrumb from "./components/Breadcrumb.svelte";
  import { otherTheme } from "./util";
  import Player from "./components/Player.svelte";
import type { Cache } from "./cache";


  export let cache: Cache;
  cache.maxParallelLoads = $config.maxParallelDownload;
  setContext("cache", cache);
  const themePreference = localStorage.getItem(StorageKeys.THEME);
  if (themePreference) {
    document.querySelector("html").setAttribute("data-theme", themePreference);
  }

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
    let pastCollection: number = parseInt(
      localStorage.getItem(StorageKeys.LAST_COLLECTION) || "0"
    );
    if (pastCollection >= cols.names.length) pastCollection = 0;
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
    } else if (menuSelection === "switch-theme") {
      const theme = otherTheme();
      document.querySelector("html").setAttribute("data-theme", theme);
      localStorage.setItem(StorageKeys.THEME, theme);
    }
  }

  let searchValue: string;

  function checkSearch(evt:KeyboardEvent) {
    if (evt.key === 'Enter' && searchValue.length>0) {
      console.debug("Start search for "+searchValue);
      $currentFolder = {value: searchValue, type: FolderType.SEARCH}
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

  $: console.debug("Selected collection is " + $selectedCollection);
</script>

<main>
  {#if !$isAuthenticated}
    <Login />
  {:else}
    <div class="head">
      <nav class="nav-bar">
        <ul>
          <li><h4><a href="/">audioserve</a></h4></li>
        </ul>
        <ul>
          <li><Menu on:menu={actOnMenu} /></li>
        </ul>
      </nav>
      <div class="search-bar grid">
        <CollectionSelector />
        <input
          type="text"
          name="search"
          placeholder="Search"
          on:keyup="{checkSearch}"
          bind:value="{searchValue}"
        />
      </div>
      <Breadcrumb />
    </div>
    <div class="browser">
      <Browser />
    </div>
    <div class="player">
      <Player />
    </div>
  {/if}
</main>

<style>
  main {
    padding: 16px;
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .head {
    flex: 0 1 auto;
  }
  .browser {
    flex: 1 1 auto;
    overflow-y: scroll;
  }
  .player {
    flex: 0 1 auto;
    border-top: 1px solid var(--color);
  }
</style>
