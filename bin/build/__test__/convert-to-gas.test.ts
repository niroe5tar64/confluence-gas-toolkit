import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import path from "node:path";
import { convertToGoogleAppsScript } from "../convert-to-gas";

describe("convert-to-gas", () => {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const sampleEntry = path.resolve(__dirname, "./sample/main.ts");
  const originalMinify = process.env.MINIFY;
  // 開発者の .env に依存せずスナップショットを一定にするため minify を無効にする
  beforeEach(() => {
    process.env.MINIFY = "false";
  });
  afterEach(() => {
    if (originalMinify === undefined) {
      delete process.env.MINIFY;
    } else {
      process.env.MINIFY = originalMinify;
    }
  });
  test("convertToGoogleAppsScript", async () => {
    const code = await convertToGoogleAppsScript(sampleEntry, "main");
    expect(code).toContain("function sayHello");
    expect(code).toContain("const hello");
    expect(code).toMatchSnapshot();
  });
});
