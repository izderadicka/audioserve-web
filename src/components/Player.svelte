<script lang="ts">
  import {
    createEventDispatcher,
    getContext,
    onDestroy,
    onMount,
    tick,
  } from "svelte";
  import {
    Cache,
    CachedItem,
    CacheEvent,
    EventType,
    PrefetchRequest,
  } from "../cache";
  import TranscodedIcon from "svelte-material-icons/ArrowCollapseVertical.svelte";
  import CachedIcon from "svelte-material-icons/Cached.svelte";
  import AudioIcon from "svelte-material-icons/SineWave.svelte";
  import FolderIcon from "svelte-material-icons/FolderOutline.svelte";
  import PlayIcon from "svelte-material-icons/Play.svelte";
  import PauseIcon from "svelte-material-icons/Pause.svelte";
  import PreviousIcon from "svelte-material-icons/SkipPrevious.svelte";
  import NextIcon from "svelte-material-icons/SkipNext.svelte";
  import RewindIcon from "svelte-material-icons/Undo.svelte";
  import ForwardIcon from "svelte-material-icons/Redo.svelte";
  import SpeedIcon from "svelte-material-icons/SpeedometerMedium.svelte";
  import VolumeIcon from "svelte-material-icons/VolumeHigh.svelte";
  import ExpandIcon from "svelte-material-icons/ChevronUp.svelte";
  import CollapsIcon from "svelte-material-icons/ChevronDown.svelte";

  import {
    config,
    currentFolder,
    playItem,
    playList,
    positionWsApi,
    selectedCollection,
    windowSize,
  } from "../state/stores";
  import { FolderType, NavigateTarget, StorageKeys } from "../types/enums";
  import { PlayItem } from "../types/play-item";
  import { formatTime } from "../util/date";
  import { splitExtInName, splitPath, splitRootPath, splitUrl } from "../util";
  import CacheIndicator from "./CacheIndicator.svelte";
  import { Throttler } from "../util/events";
  import { getLocationPath } from "../util/browser";
  import { calculateAutorewind } from "../util/play";

  const fileIconSize = "1.5rem";
  const controlSize = "48px";
  const MEDIA_ERRORS = [
    "MEDIA_ERR_ABORTED",
    "MEDIA_ERR_NETWORK",
    "MEDIA_ERR_DECODE",
    "MEDIA_ERR_SRC_NOT_SUPPORTED",
  ];

  const codeName = (code: number) => {
    if (code > 0 && code <= MEDIA_ERRORS.length) return MEDIA_ERRORS[code - 1];
    else return `UNKNOWN_${code}`;
  };

  function playerError() {
    progressValueChanging = false;
    const e = player.error;
    console.error("Player error", e);
    const msg = e.message
      ? `${codeName(e.code)} : ${e.message}`
      : codeName(e.code);
    alert(`Player Error: ${msg}, will reload window`);
    window.location.reload();
  }

  const dispatch = createEventDispatcher();
  const cache: Cache = getContext("cache");

  let expanded = false;

  let previousTime: number; // sum of time of previous items
  let totalFolderTime: number;
  $: formattedTotalFolderTime = formatTime(totalFolderTime);

  let duration: number;
  let expectedDuration: number;
  // TODO: This is WA, as ADTS with aac does not provide correct duration when cached.
  $: if (
    isFinite(duration) &&
    (!mime.startsWith("audio/m4b") || transcoded) &&
    duration > expectedDuration
  ) {
    expectedDuration = duration;
  }
  $: formattedDuration = formatTime(expectedDuration);
  let timeOffset = 0;
  let playbackTime: number;

  let currentTime: number;
  $: {
    currentTime = timeOffset + playbackTime;
  }
  function setCurrentTime(val: number, resetOffset = false) {
    if (resetOffset) timeOffset = 0;
    try {
      player.currentTime = val - timeOffset;
      progressValue = val;
    } catch (e) {
      console.error(
        `Cannot set currentTime, val=${val}, offset=${timeOffset}: ${e}`
      );
    }
  }

  $: folderTime =
    (isFinite(previousTime) ? previousTime : 0) +
    (isFinite(currentTime) ? currentTime : 0);
  $: formattedFolderTime = formatTime(folderTime);

  let paused: boolean;
  $: {
    const state = paused == null ? "none" : paused ? "paused" : "playing";
    if (navigator.mediaSession) navigator.mediaSession.playbackState = state;
  }
  export const pause = () => {
    paused = true;
  };
  let preparingPlayback = false;
  let wantPlay = false;

  let player: HTMLAudioElement;
  let buffered = [];
  let playbackRate: number = Number(
    localStorage.getItem(StorageKeys.PLAYBACK_SPEED) || 1.0
  );

  function onPlayStarted() {
    autorewind();
  }

  function onPlayPaused() {
    localStorage.setItem(StorageKeys.LAST_PAUSE, Date.now().toString());
  }

  $: if (player) {
    if (playbackRate) {
      player.defaultPlaybackRate = playbackRate;
      localStorage.setItem(StorageKeys.PLAYBACK_SPEED, playbackRate.toString());
    }

    player.addEventListener("play", onPlayStarted);
    player.addEventListener("pause", onPlayPaused);
    player.addEventListener("progress", updateBuffered);
  }

  let volume: number = Number(
    localStorage.getItem(StorageKeys.PLAYBACK_VOLUME) || 1.0
  );

  $: {
    localStorage.setItem(StorageKeys.PLAYBACK_VOLUME, volume.toString());
  }

  let fileDisplayName = "";
  let filePath: string;
  let folder = "";
  let folderPosition = 0;
  let collection: number;
  let transcoded: boolean = false;
  let cached: boolean = false;
  let mime: string;

  let progressValue = 0;
  let progressValueChanging = false;

  const handleProgressMouseUp = () => {
    if (progressValueChanging) {
      window.removeEventListener("mouseup", handleProgressMouseUp);
      window.removeEventListener("touchend", handleProgressMouseUp);
      window.requestAnimationFrame(() => {
        // on recent Chrome range value is sometime updated in next animation frame
        jumpTime(progressValue);
        setTimeout(() => {
          progressValueChanging = false;
        }, 200);
      });
    }
  };

  const handleProgressMouseDown = () => {
    progressValueChanging = true;
    window.addEventListener("mouseup", handleProgressMouseUp);
    window.addEventListener("touchend", handleProgressMouseUp);
  };

  $: formattedCurrentTime = formatTime(progressValue);

  const lastPositionThrottler = new Throttler((_time: number) => {
    localStorage.setItem(StorageKeys.LAST_POSITION, currentTime.toString());
    reportPosition();
    updateBuffered();
  }, 250);

  $: if (currentTime != undefined && isFinite(currentTime)) {
    if (!progressValueChanging) {
      progressValue = currentTime;
    }
    updateMediaSessionState();
    lastPositionThrottler.throttle(currentTime);
  }
  async function loadTime(time: number, startPlayback = false) {
    console.debug(`Seeking time on url ${$playItem.url} to time ${time}`);
    const newUrl = $playItem.url + `&seek=${time}`;
    let wasPlaying = !paused;
    timeOffset = time;
    //player.src = null;
    player.src = newUrl;
    //player.load()
    player.currentTime = 0;
    if (wasPlaying || startPlayback) {
      await playPlayer();
    }
  }

  const safeToSeekInPlayer = (time: number) => {
    let diff = time - currentTime;
    for (let i = 0; i < player.buffered.length; i++) {
      const start = timeOffset + player.buffered.start(i);
      const end = timeOffset + player.buffered.end(i);
      // console.debug(`Checking buffer star ${start} end ${end} for time ${time}`);
      if (start <= time && time <= end) {
        return true;
      } else if (time < start && diff < 0) {
        const newDiff = time - start;
        if (newDiff > diff) diff = newDiff;
      } else if (time > end && diff > 0) {
        const newDiff = time - end;
        if (newDiff < diff) diff = newDiff;
      }
    }

    return !(isNaN(diff) || diff < 0 || diff > $config.transcodingJumpLimit);
  };

  function jumpTime(time: number) {
    if (transcoded && !cached && !paused) {
      // can move only to already buffered or slightly beyond
      // otherwise use seek on server
      if (safeToSeekInPlayer(time)) {
        setCurrentTime(time);
      } else {
        loadTime(time);
      }
    } else {
      setCurrentTime(time);
    }
  }

  function jumpTimeRelative(amt: number) {
    return (evt) => {
      let toTime = progressValue + amt;
      if (toTime < 0) {
        toTime = 0;
      } else if (paused && toTime > expectedDuration) {
        toTime = expectedDuration;
      }
      jumpTime(toTime);
    };
  }

  $: folderSize = $playList?.files.length || 0;

  function reportPosition(force?: boolean) {
    if ((paused && !force) || isNaN(currentTime)) return;
    const fullPath = `/${collection}/${filePath}`;
    $positionWsApi.enqueuePosition(fullPath, currentTime);
  }

  async function startPlay(item: PlayItem): Promise<void> {
    if (item && player) {
      let source;
      if (item.cached) {
        const cachedItem = await cache?.getCachedUrl(item.url);
        if (cachedItem) {
          source = cachedItem.cachedUrl;
          console.debug("Playing cached item", source);
          cached = true;
        } else {
          console.warn("Item was removed from cache");
          cached = false;
          source = item.url;
        }
      } else {
        //const url = item.createMediaSourceUrl();
        source = item.url;
        cached = false;
      }
      player.src = source;
      localStorage.setItem(StorageKeys.LAST_FILE, item.path);
      timeOffset = 0;
      if (item.time != null && isFinite(item.time)) {
        setCurrentTime(item.time);
      }
      expectedDuration = item.duration;
      duration = 0;
      fileDisplayName = splitExtInName(item).baseName;
      filePath = item.path;
      folderPosition = item.position;
      transcoded = item.transcoded;
      mime = item.mime;
      folder = $playList.folder;
      collection = $playList.collection;
      previousTime = $playList.files
        .slice(0, item.position)
        .reduce((acc, af) => acc + af.meta.duration, 0);
      totalFolderTime = $playList.totalTime;

      if (item.startPlay) {
        await safePlayPlayer(true);
        reportPosition();
      } else {
        paused = true;
        wantPlay = false;
      }
      updateMediaSessionMetadata(item);
    }
  }

  function updateMediaSessionMetadata(item: PlayItem) {
    document.title = `${fileDisplayName} (${item.path})`;
    if ("mediaSession" in navigator) {
      const { root: artist, path: album } = splitRootPath(
        splitPath(item.path).folder
      );
      navigator.mediaSession.setPositionState(null);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fileDisplayName,
        album,
        artist,
        artwork: [{ src: "favicon.png" }],
      });

      navigator.mediaSession.setActionHandler(
        "seekbackward",
        jumpTimeRelative(-$config.jumpBackTime)
      );
      navigator.mediaSession.setActionHandler(
        "seekforward",
        jumpTimeRelative($config.jumpForwardTime)
      );
      //navigator.mediaSession.setActionHandler('seekto', function() { /* Code excerpted. */ });
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
    }
  }

  function updateMediaSessionState() {
    if (
      isFinite(currentTime) &&
      isFinite(duration) &&
      currentTime <= duration
    ) {
      navigator.mediaSession?.setPositionState({
        duration,
        playbackRate: player.playbackRate,
        position: currentTime,
      });
    }
  }

  let cacheAheadTimer: number;
  const unsubscribePlayItem = playItem.subscribe(startPlay);
  const unsubscribePlayList = playList.subscribe((pl) => {
    if (pl.folder != folder || pl.collection != collection) {
      window.clearTimeout(cacheAheadTimer);
    }
  });

  function tryCacheAhead(pos: number, currentCached = false) {
    window.clearTimeout(cacheAheadTimer);
    const delay = Math.min(
      $config.cacheAheadDelay * 1000,
      (1000 * $playItem.duration) / 2
    );
    cacheAheadTimer = window.setTimeout(
      startCacheAhead,
      delay,
      pos,
      currentCached
    );
  }

  function startCacheAhead(pos: number, currentCached = false) {
    if (!cache) return;
    const cacheAheadCount = $config.cacheAheadFiles;
    const preCaches: PrefetchRequest[] = [];
    for (let newPos = pos + 1; newPos <= pos + cacheAheadCount; newPos++) {
      if (newPos < $playList.files.length) {
        const nextFile = $playList.files[newPos];
        if (!nextFile.cached) {
          const item = new PlayItem({
            file: nextFile,
            collection,
            position: newPos,
          });
          preCaches.push({
            url: item.url,
            folderPosition: item.position,
            lowPriority: false,
          });
        }
      }
    }
    if (!currentCached || preCaches.length) {
      cache.ensureStarted();
    }

    if (cache && preCaches.length) {
      cache.cacheAhead(preCaches, {
        url: $playItem.url,
        folderPosition: $playItem.position,
      });
    }
  }

  function updateCurrentlyPlaying(evt: CacheEvent) {
    if (!cached && evt.kind === EventType.FileCached) {
      const { collection: cachedCollection, path: cachedPath } = splitUrl(
        evt.item.originalUrl,
        getLocationPath()
      );
      if (cachedCollection === collection && cachedPath === filePath) {
        switchCurrentToCached(evt.item, paused);
      }
    }
  }

  cache?.addListener(updateCurrentlyPlaying);

  function switchCurrentToCached(cachedItem: CachedItem, keepPaused = false) {
    console.debug(
      `Current file ${$playItem.url} gets cached on url ${cachedItem.cachedUrl}`
    );
    const pos = currentTime;
    const oldSrc = player.src;
    player.src = cachedItem.cachedUrl;
    cached = true;
    // $playItem.cached = true;
    if (!keepPaused) {
      progressValueChanging = true;
      playPlayer();
      player.addEventListener(
        "canplay",
        (evt) => {
          progressValueChanging = false;
          setCurrentTime(pos, true);
        },
        { once: true }
      );
    } else {
      setCurrentTime(pos, true);
    }
  }

  async function playPlayer() {
    try {
      preparingPlayback = true;
      await player.play();
    } catch (e) {
      console.error("Playback start failed because of error", e);
    }
    preparingPlayback = false;
  }

  async function safePlayPlayer(coldStart = false) {
    wantPlay = true;
    if (
      transcoded &&
      !cached &&
      (progressValue > $config.transcodingJumpLimit ||
        (coldStart && progressValue > 5))
    ) {
      if (safeToSeekInPlayer(progressValue)) {
        await playPlayer();
      } else {
        console.debug(`Should seek to position ${progressValue}`);
        await loadTime(progressValue, true);
      }
    } else {
      await playPlayer();
    }
    tryCacheAhead(folderPosition, cached);
  }

  async function playPause() {
    reportPosition(true);
    if (paused) {
      await safePlayPlayer();
    } else {
      wantPlay = false;
      player.pause();
      preparingPlayback = false;
    }
  }

  function autorewind() {
    if ($config.autorewind && progressValue > 0) {
      const lastPosition =
        Number(localStorage.getItem(StorageKeys.LAST_POSITION)) || 0;
      const lastTimestamp =
        Number(localStorage.getItem(StorageKeys.LAST_PAUSE)) || Date.now();
      const diff = Math.abs(progressValue - lastPosition); // used for sanity check, if we are in synch
      const offset = calculateAutorewind(lastTimestamp);
      if (offset > 0 && diff <= 1) {
        let newTime = progressValue - offset;
        if (newTime < timeOffset) newTime = timeOffset;
        if (
          cached ||
          !transcoded ||
          (transcoded && safeToSeekInPlayer(newTime))
        ) {
          console.debug("Autorewind to " + newTime);
          setCurrentTime(newTime, false);
        }
      }
    }
  }

  function tryNextFile() {
    if (currentTime < expectedDuration - 60) {
      console.warn(
        `Playback ended at ${currentTime} before expected duration ${expectedDuration}, maybe problem with cached version`
      );
    } else {
      console.debug(`File ${$playItem.name} on ${$playItem.path} finished`);
    }
    if (wantPlay) {
      const nextPosition = $playItem.position + 1;
      playPosition(nextPosition);
      // This is a hack to stabilize transitions on Chromium, where finished is fired twice sometimes
      const wasPlay = wantPlay;
      wantPlay = false;
      window.setTimeout(() => (wantPlay = wasPlay), 100);
    }
  }

  function playPosition(nextPosition: number, startPlay = true) {
    if (nextPosition >= 0 && nextPosition < $playList.files.length) {
      const nextFile = $playList.files[nextPosition];
      const item = new PlayItem({
        file: nextFile,
        position: nextPosition,
        startPlay,
        collection: $playList.collection,
        time: 0,
      });
      $playItem = item;
    }
  }

  function navigateToFolder() {
    dispatch("navigate", NavigateTarget.PLAYLIST_FOLDER);
  }

  function locateFile() {
    dispatch("navigate", NavigateTarget.PLAY_ITEM);
  }

  function playPrevious() {
    playPosition($playItem.position - 1, !paused);
  }

  function playNext() {
    playPosition($playItem.position + 1, !paused);
  }

  function updateBuffered() {
    const arr = [];
    for (let i = 0; i < player.buffered.length; i++) {
      arr.push({
        start: timeOffset + player.buffered.start(i),
        end: timeOffset + player.buffered.end(i),
      });
    }
    const is_different = () => {
      if (buffered.length != arr.length) {
        return true;
      } else {
        for (let i = 0; i < arr.length; i++) {
          if (
            arr[i].start !== buffered[i].start ||
            arr[i].end != buffered[i].end
          ) {
            return true;
          }
        }
        return false;
      }
    };
    if (is_different()) {
      buffered = arr;
    }
  }

  // handle arrows and space
  // play and forward and rewind by keys
  let longerJump = false;
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  function handleKeyUp(evt: KeyboardEvent) {
    if (evt.key === "Shift") {
      longerJump = false;
    }
  }

  function handleKeyDown(evt: KeyboardEvent) {
    if (evt.key === "Shift") {
      longerJump = true;
      return;
    }
    const multiplier = longerJump ? 5 : 1;

    if (evt.key === "MediaPause" || evt.key === "MediaStop") {
      pause();
      return;
    }

    if (evt.key === "MediaPlay") {
      if (paused) playPause();
      return;
    }

    if (evt.key == "MediaPlayPause") {
      playPause();
    }

    if (evt.key === "MediaTrackNext") {
      playNext();
      return;
    }
    if (evt.key == "MediaTrackPrevious") {
      playPrevious();
      return;
    }

    // disable for certain elements where keys plays a role
    if (
      (!["INPUT", "SELECT", "TEXTAREA"].includes(
        (evt.target as HTMLElement).tagName
      ) ||
        (evt.target instanceof HTMLInputElement &&
          evt.target.classList.contains("allow-global-keys"))) &&
      ["ArrowLeft", "ArrowRight", " "].includes(evt.key)
    ) {
      evt.preventDefault();
      evt.stopPropagation();

      if (evt.key === "ArrowRight") {
        jumpTimeRelative($config.jumpForwardTime * multiplier)(null);
      } else if (evt.key == "ArrowLeft") {
        jumpTimeRelative(-$config.jumpBackTime * multiplier)(null);
      } else if (evt.key == " ") {
        playPause();
      }
      return false;
    }
  }

  onMount(async () => {
    if ($playItem) {
      await startPlay($playItem);
    }
  });

  onDestroy(() => {
    unsubscribePlayItem();
    unsubscribePlayList();
    window.removeEventListener("mouseup", handleProgressMouseUp);
    window.removeEventListener("touchend", handleProgressMouseUp);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    cache?.removeListener(updateCurrentlyPlaying);
    player?.removeEventListener("progress", updateBuffered);
    player?.removeEventListener("play", onPlayStarted);
    player?.removeEventListener("pause", onPlayPaused);
  });
</script>

<div class="player-separator">
  <div
    tabindex="0"
    role="button"
    aria-label="More Controls"
    aria-expanded={expanded}
    class="player-expand-button button-like"
    on:click={() => (expanded = !expanded)}
  >
    {#if expanded}<CollapsIcon size="48px" />{:else}<ExpandIcon
        size="48px"
      />{/if}
  </div>
</div>

{#if expanded}
  <div class="extra-controls">
    <div class="volume-control slider-control extra-control">
      <span><VolumeIcon size={fileIconSize} /></span>
      <input
        tabindex="0"
        type="range"
        name="volume"
        id="volume"
        min="0"
        max="1"
        step="0.01"
        aria-label="Volume"
        bind:value={volume}
      />
      <span class="control-value">{volume.toFixed(2)}</span>
    </div>

    <div class="speed-control slider-control extra-control">
      <span><SpeedIcon size={fileIconSize} /></span>
      <input
        tabindex="0"
        type="range"
        name="playback-speed"
        id="playback-speed"
        min="0.5"
        max="3"
        step="0.1"
        aria-label="Playback Speed"
        bind:value={playbackRate}
      />
      <span class="control-value">{playbackRate.toFixed(1)}</span>
    </div>
  </div>
{/if}

<div class="info">
  <div class="item-info" id="folder-info">
    <label for="folder-name" class="icon clickable" on:click={navigateToFolder}
      ><FolderIcon size={fileIconSize} /></label
    >
    <span
      role="link"
      aria-label="Navigate to currently playing folder"
      id="folder-name"
      class="item-name link-like"
      dir="rtl"
      on:click={navigateToFolder}>{folder}</span
    >
  </div>
  <div id="total-progress">
    <div class="play-time" aria-label="Current time in whole folder">
      {formattedFolderTime}
    </div>
    <div class="progress total">
      <progress
        aria-label="Total folder playback progress"
        aria-valuetext={`${formattedFolderTime} of ${formattedTotalFolderTime}`}
        value={folderTime}
        max={totalFolderTime}
      />
    </div>
    <div class="total-time" aria-label="Total playback time of whole folder">
      {formattedTotalFolderTime}
    </div>
  </div>
  <div class="item-info" id="file-info">
    <label
      for="file-name"
      class="clickable"
      on:click={locateFile}
      title={cached
        ? "Playing cached file"
        : transcoded
        ? "Playing transcoded file"
        : "Playing streamed file"}
    >
      {#if cached}
        <CachedIcon size={fileIconSize} />
      {:else if transcoded}
        <TranscodedIcon size={fileIconSize} />
      {:else}
        <AudioIcon size={fileIconSize} />
      {/if}
    </label>
    <span
      class="label clickable"
      on:click={locateFile}
      aria-label="Position of currently playing file in folder"
    >
      (<span>{folderSize ? folderPosition + 1 : 0}</span>/<span
        >{folderSize}</span
      >)
    </span>
    <span
      role="link"
      aria-label="Locate currently playing file"
      id="file-name"
      class="item-name link-like"
      on:click={locateFile}
    >
      {fileDisplayName}
    </span>
  </div>
</div>
<div class="player">
  <audio
    preload="none"
    crossorigin="use-credentials"
    bind:duration
    bind:currentTime={playbackTime}
    bind:paused
    bind:volume
    bind:playbackRate
    bind:this={player}
    on:error={playerError}
    on:ended={tryNextFile}
  />
  <div class="play-time" aria-label="Current time in file">
    {formattedCurrentTime}
  </div>
  <div class="progress">
    <div class="progress-bar">
      <input
        class="allow-global-keys"
        type="range"
        id="playback-progress"
        min="0"
        max={expectedDuration}
        bind:value={progressValue}
        on:mousedown={handleProgressMouseDown}
        on:touchstart={handleProgressMouseDown}
        aria-label="File Playback Time"
        aria-valuetext={`${formattedCurrentTime} of ${formattedDuration}`}
        on:keydown={(evt) => evt.preventDefault()}
      />
      <CacheIndicator ranges={buffered} totalTime={expectedDuration} />
    </div>
  </div>
  <div class="total-time" aria-label="Total time of current file">
    {formattedDuration}
  </div>
</div>
<div class="controls-bar">
  <div class="player-controls">
    <span
      tabindex="0"
      role="button"
      aria-label="Previous"
      class="control-button button-like"
      on:click={playPrevious}
    >
      <PreviousIcon size={controlSize} />
    </span>
    <span
      tabindex="0"
      role="button"
      aria-label="Jump back"
      class="control-button button-like"
      title="You can also use Left Arrow key"
      on:click={jumpTimeRelative(-$config.jumpBackTime)}
    >
      <RewindIcon size={controlSize} />
    </span>
    <span
      tabindex="0"
      role="button"
      aria-label={paused ? "Play" : "Pause"}
      title="You can also use Space key"
      class="control-button button-like"
      class:blink={preparingPlayback}
      on:click={playPause}
    >
      {#if paused}
        <PlayIcon size={controlSize} />
      {:else}
        <PauseIcon size={controlSize} />
      {/if}
    </span>
    <span
      tabindex="0"
      role="button"
      aria-label="Jump ahead"
      class="control-button button-like"
      title="You can also use Right Arrow key"
      on:click={jumpTimeRelative($config.jumpForwardTime)}
    >
      <ForwardIcon size={controlSize} />
    </span>
    <span
      tabindex="0"
      role="button"
      aria-label="Next"
      class="control-button button-like"
      on:click={playNext}
    >
      <NextIcon size={controlSize} />
    </span>

    <!-- <span class="control-button" on:click={null}>
    <span><SpeedIcon size="{controlSize}" /></span>
  </span> -->
  </div>
</div>

<style>
  .extra-controls {
    margin-top: 1rem;
  }

  .extra-control {
    display: flex;
    flex-direction: row;
    gap: 1em;
  }
  .slider-control {
    flex-grow: 1;
  }

  .player-separator {
    background-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0),
      rgba(var(--background-rgb), 1)
    );
    position: relative;
    top: -24px;
    margin-bottom: -24px;
    width: calc(100% - 16px);
  }

  @media (max-width: 400px) {
    .player-separator {
      width: 100%;
    }
  }

  .player-expand-button {
    display: block;
    margin-left: auto;
    margin-right: auto;
    width: 48px;
    height: 25px;
    color: var(--primary);
    position: relative;
    top: -12px;
  }

  div.item-info {
    display: flex;
    flex-direction: row;
    gap: 0.33rem;
  }

  span.item-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .label {
    font-weight: bold;
  }

  .player-controls {
    color: var(--primary);
    max-width: 380px;
    margin-left: auto;
    margin-right: auto;
    margin-bottom: 0.33rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .player-controls span {
    display: block;
    cursor: pointer;
  }

  #total-progress {
    display: flex;
    flex-flow: row;
    align-items: center;
  }
  progress {
    height: 3px;
    margin-top: 0.5rem;
  }
  .progress-bar input {
    margin-bottom: 0;
  }

  .clickable {
    cursor: pointer;
  }

  .progress {
    flex-grow: 1;
    margin-left: 1rem;
    padding-top: 0.7 rem;
  }

  .progress.total {
    padding-top: 0;
  }
  .total-time {
    margin-left: 1rem;
    width: 4.1rem;
  }
  .play-time {
    width: 4.1rem;
    text-align: end;
  }
  .player {
    display: flex;
    flex-flow: row;
    align-items: center;
    height: 1.2rem;
    margin-bottom: 0.33 rem;
  }

  label {
    display: inline;
    font-weight: bold;
  }
  .info {
    margin-top: 0.5em;
  }

  .blink {
    animation: blink 4s infinite both;
  }

  @keyframes blink {
    0%,
    50%,
    100% {
      opacity: 1;
    }
    25%,
    75% {
      opacity: 0.5;
    }
  }

  @media (max-height: 400px) {
    .info {
      display: none;
    }
    .player-separator {
      display: none;
    }

    .extra-controls {
      display: none;
    }

    div.player {
      margin-top: 1rem;
    }
  }
</style>
