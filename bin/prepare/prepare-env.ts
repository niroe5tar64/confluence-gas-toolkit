import fs from "node:fs";
import path from "node:path";

/**
 * Prepare a .env file for the current target environment.
 * Copies .env.dev or .env.prod to .env based on the presence of --prod.
 */
const prepareEnv = async (): Promise<void> => {
  const prod = process.argv.some((arg) => arg === "--prod");
  const envFile = prod ? ".env.prod" : ".env.dev";
  const projectRoot = process.cwd();
  const sourceFile = path.join(projectRoot, envFile);
  const destFile = path.join(projectRoot, ".env");

  if (!fs.existsSync(sourceFile)) {
    console.warn(`Warning: ${envFile} not found, skipping .env preparation`);
    return;
  }

  fs.copyFileSync(sourceFile, destFile);
  console.log(`Prepared .env from ${envFile}`);
};

export { prepareEnv };
