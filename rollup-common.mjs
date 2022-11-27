import pkg from "./package.json" assert { type: 'json' };
import gitCommitId from "git-commit-id";

export const production = !process.env.ROLLUP_WATCH;
export const VERSION = pkg.version
export const COMMIT_HASH = gitCommitId();
export const COMMIT_HASH_SHORT = COMMIT_HASH.substring(0, 8);

/** @type {import("@rollup/plugin-typescript").RollupTypescriptOptions} */
export const replaceConfig =
{
    preventAssignment: true,
    include: "src/util/version.ts",
    "REPLACE_ENV": () => production ? "PRODUCTION" : "DEVELOPMENT",
    "REPLACE_VERSION": pkg.version,
    "REPLACE_COMMIT_HASH": COMMIT_HASH_SHORT,

};

