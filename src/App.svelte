<script lang="ts">
	import '@picocss/pico';
	import Login from './components/Login.svelte';
	
	import {apiConfig, colApi, isAuthenticated} from './state/stores';
	import {onMount} from 'svelte';
import { CollectionsApi, Configuration } from './client';


	const API_BASE_URL = "http://localhost:3000";
	apiConfig.set(new Configuration({
		basePath: API_BASE_URL,
		credentials: 'include',
	}));

	async function loadCollections() {
		const collections = await $colApi.collectionsGet();
		console.debug("Got collections list", collections);
		const transcodings = await $colApi.transcodingsGet();
		console.debug("Got transcodings list", transcodings);
	}

	

	onMount(async () => {
		
		try {
			await loadCollections();
		} catch (e) {
			console.error("Error loading initial lists",typeof e, e);
			$isAuthenticated = false;
			// try to load again after authentication
			const unsubsribe = isAuthenticated.subscribe(async ok => { if (ok) {
				await loadCollections();

			}})
		}
		
	})
</script>


<main class="container">

{#if ! $isAuthenticated}
	<Login/>
{:else}
	<nav class="nav-bar">
		<ul>
			<li><a href="/">AS</a></li>
			<li></li>
			<li>[Menu]</li>
		</ul>
	</nav>
	<div class="browser">
		<div class="breadcrumb">[home/neco/neco]</div>
		<div class="browser">

		</div>
	</div>
	<div class="player">
		[player]
	</div>
{/if}

</main>
	


<style>
	
</style>