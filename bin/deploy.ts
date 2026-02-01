import { $ } from "bun";
import { prepareClaspJson } from "./prepare/prepare-clasp-json";
import { prepareConfig } from "./prepare/prepare-config";
import { prepareEnv } from "./prepare/prepare-env";

await prepareClaspJson();
await prepareConfig();
await prepareEnv();
await $`bun run build`;
await $`bunx clasp deploy`;
