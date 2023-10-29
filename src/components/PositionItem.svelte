<script lang="ts">
  import { beforeUpdate } from "svelte";
  import type { Position } from "../client";
  import { formatTime, formatTimeAgo } from "../util/date";
  import { fileToHumanName } from "../util";

  export let position: Position;
  let name: string | undefined;

  beforeUpdate(() => {
    name = fileToHumanName(position.file);
  });
</script>

<div>
  <h4 class="title">
    <div class="item-header" role="link">{name}</div>
  </h4>
  <h6 class="subtitle" class:finished={position.folderFinished}>
    {position.folder}
  </h6>
  <div class="position-time">
    {formatTimeAgo(position.timestamp)}
    (pos. {formatTime(position.position)})
  </div>
</div>

<style>
  .title {
    margin-bottom: 0.15rem;
  }

  .finished {
    color: var(--secondary);
  }

  .finished::after {
    content: " ✓";
  }

  .subtitle {
    font-style: italic;
    margin-left: 1rem;
    font-weight: normal;
    margin-bottom: 0.1rem;
  }
  .position-time {
    margin-left: 1rem;
  }
</style>
