import fs from "node:fs";
import path from "node:path";

const prepareClaspJson = async () => {
  const prod = process.argv.some((arg) => arg === "--prod");
  const claspFile = prod ? ".clasp-prod.json" : ".clasp-dev.json";
  const projectRoot = path.resolve(import.meta.dir, "../../");
  const sourceFile = path.join(projectRoot, claspFile);
  const destFile = path.join(projectRoot, ".clasp.json");

  fs.copyFileSync(sourceFile, destFile);
};

export { prepareClaspJson };
