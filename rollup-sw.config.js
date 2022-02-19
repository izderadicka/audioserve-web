import typescript from '@rollup/plugin-typescript';
//import resolve from '@rollup/plugin-node-resolve';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/service-worker.ts',
  
  output: {
    sourcemap: true,
    dir: 'public',
    format: 'es'
  },
  plugins: [typescript({
    sourceMap: !production,
    inlineSources: !production,
    tsconfig: 'tsconfig-sw.json'
})]
};