/// <reference types="svelte" />

//This can be used to add custom events to HtmlElements
declare namespace svelte.JSX {
    interface HTMLProps<T> {
        onoutclick?: (e: CustomEvent) => void;
    }
}