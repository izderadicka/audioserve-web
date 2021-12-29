<script lang=ts>

import { apiConfig, isAuthenticated } from '../state/stores';
import {AuthenticationApi} from '../client/apis'
import { encodeSecret } from '../util/auth';
import { Configuration } from '../client';

    let sharedSecret:string;
    let playbackGroup:string;
    let loginError = false;

    async function login() {
        console.debug("Initiating client login");
        loginError = false;
        if (sharedSecret) {
            const secret = await encodeSecret(sharedSecret);
            const client = new AuthenticationApi($apiConfig);
            try {
                const token = await client.authenticatePost({secret});
                console.debug("Client succesfully authenticated with server")
                $isAuthenticated = true;
                apiConfig.update((cfg) => new Configuration({
                    basePath: cfg.basePath,
                    credentials: cfg.credentials,
                    //accessToken: token // TBD enable access token 
                }))
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
    {#if loginError} 
    <p class="warning">Login failed!</p>
    {/if}
    <form on:submit|preventDefault="{login}">
        <label for="shared-secret">Shared Secret</label>
        <input type="password" name="shared-secret" bind:value="{sharedSecret}">
        <label for="playback-group">Playback Group</label>
        <input type="text" name="playback-group" bind:value="{playbackGroup}">
        <button id="login-button">Log in</button>
    </form>
</div>