import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import gitCommitId from "git-commit-id";

export const production = !process.env.ROLLUP_WATCH;
export const COMMIT_HASH_SHORT = gitCommitId().substring(0, 8);
export const replaceConfig =
{
  preventAssignment: true,
  include: "src/service-worker.ts",
  "IS_DEVELOPMENT": () => production ? 'false' : 'true',
  "COMMIT_HASH_SHORT": `"${COMMIT_HASH_SHORT}"`,

};

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