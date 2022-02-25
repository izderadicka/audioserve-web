import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
//import resolve from '@rollup/plugin-node-resolve';
import {production, VERSION, replaceConfig} from "./rollup-common";

export default {
  input: 'src/service-worker.ts',
  
  output: {
    sourcemap: true,
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