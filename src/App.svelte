<script lang="ts">
	import '@picocss/pico';
	import Login from './components/Login.svelte';
	
	import {apiConfig, isAuthenticated} from './state/stores';
	import {onMount} from 'svelte';

	const API_BASE_URL = "http://localhost:3000";
	apiConfig.set({
		basePath:API_BASE_URL
	});

	onMount(async () => {
		
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