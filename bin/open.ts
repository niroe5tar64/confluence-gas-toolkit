import { $ } from "bun";
import { prepareClaspJson } from "./prepare/prepare-clasp-json";

await prepareClaspJson();
await $`bunx clasp open`;
