import fs from "node:fs";
import path from "node:path";

/**
 * 環境別の設定ファイルを準備する
 * src/config/*.dev.ts または *.prod.ts を *.ts にコピー
 */
const prepareConfig = async (): Promise<void> => {
  const prod = process.argv.some((arg) => arg === "--prod");
  const envSuffix = prod ? ".prod" : ".dev";
  const configDir = path.resolve(import.meta.dir, "../../src/config");

  // 環境別設定ファイルのパターン
  const configFiles = ["confluence-page-configs", "slack-messages"];

  for (const configName of configFiles) {
    const sourceFile = path.join(configDir, `${configName}${envSuffix}.ts`);
    const destFile = path.join(configDir, `${configName}.ts`);

    if (!fs.existsSync(sourceFile)) {
      console.warn(`Warning: ${configName}${envSuffix}.ts not found, skipping`);
      continue;
    }

    fs.copyFileSync(sourceFile, destFile);
    console.log(`Prepared ${configName}.ts from ${configName}${envSuffix}.ts`);
  }
};

export { prepareConfig };
