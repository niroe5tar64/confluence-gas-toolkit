import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareEnv } from "./prepare-env";

await prepareClaspJson();
await prepareEnv();
await $`bunx clasp open`;
