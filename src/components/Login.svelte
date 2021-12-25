<script lang=ts>

    import {AuthenticationApiFp} from '../api';
import { apiConfig } from '../state/stores';

    let sharedSecret:string;
    let playbackGroup:string;

    async function login() {
        console.log("Initiating client login");
        if (sharedSecret) {
            //const reply =  AuthenticationApiFp({});
        }
    }

</script>

<div class="login">
    <h1>Audioserve Login</h1>
    <form on:submit|preventDefault="{login}">
        <label for="shared-secret">Shared Secret</label>
        <input type="password" name="shared-secret" bind:value="{sharedSecret}">
        <label for="playback-group">Playback Group</label>
        <input type="text" name="playback-group" bind:value="{playbackGroup}">
        <button id="login-button">Log in</button>
    </form>
</div>