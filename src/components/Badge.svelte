<script lang="ts">
  export let value: any;
</script>

<span class="badge">{value}</span>

<style>
  .badge {
    color: var(--primary-inverse);
    background-color: var(--primary);
    display: inline-block;
    padding: 0.25em 0.4em;
    font-size: 75%;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    border-radius: 0.25rem;
    transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
      border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
</style>
