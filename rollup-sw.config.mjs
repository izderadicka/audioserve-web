import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
//import resolve from '@rollup/plugin-node-resolve';
import { production, VERSION, replaceConfig } from "./rollup-common.mjs";

export default {
  input: 'src/service-worker.ts',

  output: {
    sourcemap: !production,
    dir: 'public',
    format: 'es'
  },
  plugins: [
    replace(replaceConfig),
    typescript({
      sourceMap: !production,
      inlineSources: !production,
      tsconfig: 'tsconfig-sw.json'
    })]
};