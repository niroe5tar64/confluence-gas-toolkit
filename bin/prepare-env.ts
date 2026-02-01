import fs from "node:fs";

/**
 * Prepare a .env file for the current target environment.
 * Copies .env.dev or .env.prod to .env based on the presence of --prod.
 */
const prepareEnv = async (): Promise<void> => {
  const prod = process.argv.some((arg) => arg === "--prod");
  const envFile = prod ? ".env.prod" : ".env.dev";

  if (!fs.existsSync(`./${envFile}`)) {
    console.warn(`Warning: ${envFile} not found, skipping .env preparation`);
    return;
  }

  fs.copyFileSync(`./${envFile}`, "./.env");
  console.log(`Prepared .env from ${envFile}`);
};

export { prepareEnv };
