# New audioserve web client 
**[DEMO AVAILABLE](https://audioserve.zderadicka.eu) (shared secret: mypass)**
  
Main motivation is to try new technologies, so [Svelte](https://svelte.dev) and [TypeScript](https://www.typescriptlang.org/) are used as main languages and [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) technologies are used.

Key focus is on efficient caching of audio files, something similar to what is available in [Android client](https://github.com/izderadicka/audioserve-android) - so Service Worker and CacheStorage are used.

My idea is that this application should fully replace mobile (Android) client in future.


For now works better in Chrome/Chromium, but Firefox should be also fine most of the time (ServiceWorker seems to be more "stable" in Chrome). Apple (Safari) users should change transcoding configuration on server to `aac-in-adts`, see [audioserve README](https://github.com/izderadicka/audioserve#alternative-transcodings-and-transcoding-configuration-for-apple-users) and also should add `audio/ogg` to always transcoded setting in client.

I'm definitely **interested in feedback** so you can log issues on this project.

## Known limitations 

Comparing with native Android app there are some limitations, which are given by restrictions of mobile browsers and I do not see any possible workaround:
1. Sensors API works only for active/visible browser window, thus for extension of sleep time by shaking you have to unlock screen first - thus it is not so useful.
2. MediaSession on mobile browser behaves differently from native app, thus media notification is not so useful and behaves inconsistently. This will require bit more research.
3. Javascript is paused on inactive/background windows, from what I tried it's kept running only, if audio is playing. This limits possibility to cache ahead audio files, when browser in in background and not playing. Again this will require more research. 

Service workers work only in secure context and same origin (or localhost). Thus caching is limited only to this setup.


## How to use?

You will need audioserve server running somewhere with this client. There are multiple options:

- use `izderadicka/audioserve` image from dockerhub. New client is already there.
  
- to have lastest version clone this project and build client:

```
npm install && npm run build-sw && npm run build 
```
> important build-sw must be run first


then either copy and replace existing web client in client directory of audioserve, or use argument `--client-dir` to use directory with built client (built code is in `dist` subdirectory).


## License 
MIT

## Generated code for src/client

Code for client API is generated by [OpenApi Generator](https://github.com/OpenAPITools/openapi-generator) using following command:

```
java -jar openapi-generator-cli.jar generate -i ~/workspace/audioserve/docs/audioserve-api-v1.yaml -g typescript-fetch -o ./client --additional-properties=typescriptThreePlus=true
```

However there is a problem with generator and  endpoint /positions/{group}/{colId}/{path}, because it can return either position or array of positions, which is not handled correctly by generator (generates invalid typescript). But this endpoint is not needed for client, so before generation just delete it from the OpenAPI yaml file.



