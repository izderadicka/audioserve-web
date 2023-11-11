import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import pkg from "./package.json" assert { type: 'json' };
import gitCommitId from "git-commit-id";

export const COMMIT_HASH: string = gitCommitId();
export const VERSION: string = pkg.version;
process.env.VITE_COMMIT_HASH = COMMIT_HASH;
process.env.VITE_COMMIT_HASH_SHORT = COMMIT_HASH.substring(0,8);
process.env.VITE_VERSION = VERSION;

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [svelte()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "bundle.js",
        assetFileNames: "bundle.[ext]"
      }
    }
  }
})
