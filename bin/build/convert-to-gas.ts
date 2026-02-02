import fs from "node:fs";
import path from "node:path";
import { ensureDirSync } from "fs-extra";
import { build as buildUsingVite } from "vite";

const loadDotEnv = (envPath: string) => {
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

const resolveEnvPath = () => {
  const cwd = process.cwd();
  const directEnv = path.resolve(cwd, ".env");
  if (fs.existsSync(directEnv)) {
    return directEnv;
  }
  const isProd = process.argv.includes("--prod");
  const preferred = path.resolve(cwd, isProd ? ".env.prod" : ".env.dev");
  return preferred;
};

const build = async (filename: string, name: string) => {
  loadDotEnv(resolveEnvPath());
  const isProdBuild = process.argv.includes("--prod");
  const appEnv = isProdBuild || process.env.APP_ENV === "prod" ? "prod" : "dev";
  const res = await buildUsingVite({
    root: process.cwd(),
    build: {
      write: false,
      minify: process.env.MINIFY === "true", // 環境変数に指定可能
      lib: {
        entry: filename,
        name,
        formats: ["iife"],
      },
    },
    define: {
      "process.env.TARGET": JSON.stringify("GAS"), // GAS 環境としてビルド
      "process.env.APP_ENV": JSON.stringify(appEnv),
    },
  });
  const code = Array.isArray(res) ? res[0].output[0].code : "";
  return code;
};

const extractExportUsingDynamicImport = async (path: string, globalName: string) => {
  const imported = await import(path);
  const exports = Object.entries(imported)
    .map(([name, obj]) => {
      return typeof obj === "function"
        ? `function ${name}(...args){ return ${globalName}.${name}(...args);}`
        : `const ${name} = ${globalName}.${name};`;
    })
    .join("\n");
  return exports;
};

const convertToGoogleAppsScript = async (filename: string, globalName: string) => {
  const code = await build(filename, globalName);
  const exports = await extractExportUsingDynamicImport(filename, globalName);
  return `${code}\n\n${exports}\n`;
};

const convertAndWriteGoogleAppsScript = async (
  filename: string,
  globalName: string,
  output: string,
  banner = "",
) => {
  const code = banner + (await convertToGoogleAppsScript(filename, globalName));
  const outputDir = path.dirname(output);
  ensureDirSync(outputDir);
  fs.writeFileSync(output, code);
};

export { convertToGoogleAppsScript, convertAndWriteGoogleAppsScript };
