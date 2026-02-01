import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareEnv } from "./prepare-env";

await prepareClaspJson();
await prepareEnv();
await $`bun run build`;
await $`bunx clasp deploy`;
