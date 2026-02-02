import { $ } from "bun";
import { prepareClaspJson } from "./prepare/prepare-clasp-json";
import { prepareConfig } from "./prepare/prepare-config";
import { prepareEnv } from "./prepare/prepare-env";

const isProd = process.argv.some((arg) => arg === "--prod");
const appEnv = isProd ? "prod" : "dev";

await prepareClaspJson();
await prepareConfig();
await prepareEnv();
await $`APP_ENV=${appEnv} bun run build ${isProd ? "-- --prod" : ""}`;
await $`bunx clasp deploy`;
