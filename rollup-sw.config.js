import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
//import resolve from '@rollup/plugin-node-resolve';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/service-worker.ts',
  
  output: {
    sourcemap: true,
    dir: 'public',
    format: 'es'
  },
  plugins: [
  replace({
    preventAssignment: true,
    "DEVELOPMENT": () => production?"PRODUCTION":"DEVELOPMENT"
  }),
  typescript({
    sourceMap: !production,
    inlineSources: !production,
    tsconfig: 'tsconfig-sw.json'
})]
};