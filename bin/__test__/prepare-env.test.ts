import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prepareEnv } from "../prepare-env";

describe("prepareEnv", () => {
  const baseArgv = [...process.argv];
  let originalCwd: string;
  let testDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-env-test-"));
    process.chdir(testDir);
    process.argv = [...baseArgv];
  });

  afterEach(() => {
    process.argv = baseArgv;
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("copies .env.dev to .env when --prod is absent", async () => {
    fs.writeFileSync(".env.dev", "ENV=development");
    process.argv = ["bun", "prepare-env"];

    await prepareEnv();

    expect(fs.readFileSync(".env", "utf8")).toBe("ENV=development");
  });

  test("copies .env.prod to .env when --prod is present", async () => {
    fs.writeFileSync(".env.prod", "ENV=production");
    process.argv = ["bun", "prepare-env", "--prod"];

    await prepareEnv();

    expect(fs.readFileSync(".env", "utf8")).toBe("ENV=production");
  });

  test("warns and skips when the source file is missing", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    process.argv = ["bun", "prepare-env"];

    await prepareEnv();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: .env.dev not found, skipping .env preparation",
    );
    expect(fs.existsSync(".env")).toBe(false);
    warnSpy.mockRestore();
  });
});
