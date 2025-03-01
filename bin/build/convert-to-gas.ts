import { build as buildUsingVite } from "vite";
import fs from "node:fs";
import path from "node:path";
import { ensureDirSync } from "fs-extra";

const build = async (filename: string, name: string) => {
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
