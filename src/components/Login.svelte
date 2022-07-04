<script lang="ts">
  import { apiConfig, group, isAuthenticated } from "../state/stores";
  import { AuthenticationApi } from "../client/apis";
  import { encodeSecret } from "../util/auth";
  import { Configuration } from "../client";
  import { StorageKeys } from "../types/enums";
  import { getContext } from "svelte";

  let sharedSecret: string;
  let playbackGroup: string = localStorage.getItem(StorageKeys.GROUP);
  let loginError = false;
  const cache = getContext("cache");

  async function login() {
    console.debug("Initiating client login");
    loginError = false;
    if (sharedSecret) {
      const secret = await encodeSecret(sharedSecret);
      const client = new AuthenticationApi($apiConfig);
      try {
        const token = await client.authenticatePost({ secret });
        console.debug("Client succesfully authenticated with server");
        $isAuthenticated = true;
        apiConfig.update(
          (cfg) =>
            new Configuration({
              basePath: cfg.basePath,
              credentials: cfg.credentials,
              //accessToken: token // TBD enable access token
            })
        );
        if (playbackGroup) {
          localStorage.setItem(StorageKeys.GROUP, playbackGroup);
          $group = playbackGroup;
        } else {
          localStorage.removeItem(StorageKeys.GROUP);
        }
      } catch (e) {
        console.error("Login error", e);
        loginError = true;
        $isAuthenticated = false;
      }
      sharedSecret = "";
    }
  }
</script>

<div class="login">
  <h1>Audioserve Login</h1>
  {#if cache == null}
    <p class="warning" role="alert">
      Service Worker is not available. You're probably not using secure
      connection connection or you have old browser. Some functionality
      (especially caching] will not be available.
    </p>
  {/if}
  {#if loginError}
    <p class="warning" role="alert">Login failed!</p>
  {/if}
  <form on:submit|preventDefault={login}>
    <label for="shared-secret">Shared Secret</label>
    <input
      type="password"
      name="shared-secret"
      id="shared-secret"
      bind:value={sharedSecret}
    />
    <label for="playback-group">Playback Group</label>
    <input
      type="text"
      name="playback-group"
      id="playback-group"
      bind:value={playbackGroup}
    />
    <button id="login-button">Log in</button>
  </form>
</div>
