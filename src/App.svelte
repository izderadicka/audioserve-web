<script lang="ts">
  import "@picocss/pico";
  import Login from "./components/Login.svelte";
  import Menu from "./components/Menu.svelte";
  import SearchIcon from "svelte-material-icons/Magnify.svelte";
  import CollectionsIcon from "svelte-material-icons/LibraryShelves.svelte";
  import CloseIcon from "svelte-material-icons/Close.svelte";
  import DownloadIcon from "svelte-material-icons/DownloadMultiple.svelte";

  import {
    apiConfig,
    colApi,
    isAuthenticated,
    collections,
    transcodings,
    selectedCollection,
    config,
    currentFolder,
    windowSize,
    playItem,
pendingDownloads,
  } from "./state/stores";
  import { onMount, setContext } from "svelte";
  import { Configuration } from "./client";
  import { deleteCookie } from "./util/auth";
  import CollectionSelector from "./components/CollectionSelector.svelte";
  import Browser from "./components/Browser.svelte";
  import { FolderType, StorageKeys } from "./types/enums";
  import Breadcrumb from "./components/Breadcrumb.svelte";
  import { baseUrl, otherTheme } from "./util/browser";
  import Player from "./components/Player.svelte";
  import type { Cache } from "./cache";
  import { isDevelopment } from "./util/version";

  export let cache: Cache;
  cache.maxParallelLoads = $config.maxParallelDownload;
  cache.onQueueSizeChanged((n) => pendingDownloads.set(n));
  setContext("cache", cache);
  const themePreference = localStorage.getItem(StorageKeys.THEME);
  if (themePreference) {
    document.querySelector("html").setAttribute("data-theme", themePreference);
  }

  const API_BASE_URL = isDevelopment ? "http://localhost:3000" : baseUrl();
  apiConfig.set(
    new Configuration({
      basePath: API_BASE_URL,
      credentials: "include",
    })
  );

  let container: HTMLDivElement;

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
    switch (menuSelection) {
      case "logout":
        $isAuthenticated = false;
        deleteCookie();
        break;
      case "switch-theme":
        const theme = otherTheme();
        document.querySelector("html").setAttribute("data-theme", theme);
        localStorage.setItem(StorageKeys.THEME, theme);
        break;
      case "clear-cache":
        cache.clearCache().then(() => {
          cache.cancelPendingLoads("", true);
          window.location.reload();
        });
        break;
    }
  }

  let searchValue: string;

  function checkSearch(evt: KeyboardEvent) {
    if (evt.key === "Enter" && searchValue.length > 0) {
      console.debug("Start search for " + searchValue);
      $currentFolder = { value: searchValue, type: FolderType.SEARCH };
    }
  }

  let error: string = null;

  onMount(async () => {
    try {
      await loadCollections();
    } catch (e) {
      console.error("Error loading initial lists", e);
      if (e instanceof Response) {
        if (e.status === 401) {
          $isAuthenticated = false;
          // try to load again after authentication
          const unsubsribe = isAuthenticated.subscribe(async (ok) => {
            if (ok) {
              await loadCollections();
            }
          });
        } else {
          error = `Unexpected respose from server: ${e.status} ${e.statusText}`;
        }
      } else {
        error = `Cannot contact server: ${e}`;
      }
    }
  });

  $: console.debug("Selected collection is " + $selectedCollection);

  let showSearch = true;
  let showCollectionSelect = true;
  let showLogo = true;
  let smallScreen = false;

  windowSize.subscribe((sz) => {
    if (sz.width <= 770) {
      if (!smallScreen) {
        showSearch = false;
        showCollectionSelect = false;
        showLogo = true;
      }
      smallScreen = true;
      
    } else {
      showSearch = true;
      showCollectionSelect = true;
      smallScreen = false;
      showLogo = true;
    }
  });

  function toggleCollectionsSelect() {
    if (showCollectionSelect) {
      showCollectionSelect = false;
      showSearch = false;
      showLogo = true;
    } else {
      showCollectionSelect = true;
      showSearch = false;
      showLogo = false;
    }
  }

  function toggleSearch() {
    if (showSearch) {
      showSearch = false;
      showCollectionSelect = false;
      showLogo = true;
    } else {
      showSearch = true;
      showCollectionSelect = false;
      showLogo = false;
    }
  }

  function closeNavInput() {
    showSearch = false;
    showCollectionSelect = false;
    showLogo = true;
  }
</script>

<main>
  {#if error}
    <h2>Error!</h2>
    <p>{error}</p>
  {:else if !$isAuthenticated}
    <Login />
  {:else}
    <div class="head">
      <nav class="nav-bar">
        {#if showLogo}
          <ul>
            <li><h4><a href="/">audioserve</a></h4></li>
          </ul>
        {/if}
        <ul class="right-bar">
          <li class="search-bar-box">
            <div class="search-bar">
              {#if showCollectionSelect}
                <CollectionSelector />
                {#if smallScreen}
                  <span on:click={closeNavInput}
                    ><CloseIcon size="1.6rem" /></span
                  >
                {/if}
              {/if}

              {#if showSearch}
                <input
                  type="text"
                  name="search"
                  placeholder="Search"
                  on:keyup={checkSearch}
                  bind:value={searchValue}
                />
                {#if smallScreen}
                  <span on:click={closeNavInput}
                    ><CloseIcon size="1.6rem" /></span
                  >
                {/if}
              {/if}
            </div>
          </li>
          <li class="icons">
            {#if !showCollectionSelect && !showSearch && smallScreen}
              <span on:click={toggleCollectionsSelect}
                ><CollectionsIcon size="1.5rem" /></span
              >
              <span on:click={toggleSearch}><SearchIcon size="1.5rem" /></span>
            {/if}
            {#if !showCollectionSelect && !showSearch || !smallScreen}
            {#if $pendingDownloads > 0}
            <span>
              <DownloadIcon size="1.5rem" /> {$pendingDownloads}
            </span>
            {/if}
            {/if}
            <Menu on:menu={actOnMenu} />
          </li>
        </ul>
      </nav>

      <Breadcrumb />
    </div>
    <div class="browser" bind:this={container}>
      <Browser {container} />
    </div>
    {#if $playItem}
      <div class="player">
        <Player />
      </div>
    {/if}
  {/if}
</main>

<style>
  .icons {
    display: flex
  }
  .right-bar {
    flex-grow: 1;
  }

  .search-bar {
    display: flex;
    flex-direction: row;
  }

  .search-bar-box {
    flex-grow: 1;
  }

  .search-bar-box input {
    margin-bottom: 0;
  }
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
    position: relative;
  }
  .player {
    flex: 0 1 auto;
    border-top: 1px solid var(--color);
  }

  @media (max-height: 740px) {
    main {
    padding-top: 4px;
    padding-bottom: 0px ;
    }

  }
</style>
