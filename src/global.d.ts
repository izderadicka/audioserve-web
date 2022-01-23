/// <reference types="svelte" />

declare namespace svelte.JSX {
    interface HTMLProps<T> {
        onoutclick?: (e: CustomEvent) => void;
    }
}