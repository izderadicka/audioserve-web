/// <reference types="svelte" />
/// <reference types="vite/client" />

//This can be used to add custom events to HtmlElements
declare namespace svelteHTML {
  interface HTMLProps<T> {
    onoutclick?: (e: CustomEvent) => void;
    onintersect?: (e: CustomEvent) => void;
    onslidestart?: (e: CustomEvent) => void;
    onslidemove?: (e: CustomEvent) => void;
    onslideend?: (e: CustomEvent) => void;
  }
}
