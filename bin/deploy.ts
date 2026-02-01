import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareConfig } from "./prepare-config";
import { prepareEnv } from "./prepare-env";

await prepareClaspJson();
await prepareConfig();
await prepareEnv();
await $`bun run build`;
await $`bunx clasp deploy`;
