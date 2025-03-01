export function getEnvVariable(key: string): string | null {
  if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
    // ローカル環境 (Bun/Node.js)
    return process.env[key] || null;
  }
  // GAS環境
  const props = PropertiesService.getScriptProperties();
  return props ? props.getProperty(key) : null;
}
