/**
 * 引数で指定したキーの環境変数を取得する。
 *
 * ローカル環境 (Bun/Node.js) では process.env を使用し、
 * GAS環境では PropertiesService を使用します。
 *
 * @param {string} key - 環境変数のキー
 * @returns {string | null} - 環境変数の値。存在しない場合はnullを返す。
 */
export function getEnvVariable(key: string): string | null {
  if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
    // ローカル環境 (Bun/Node.js)
    return process.env[key] || null;
  }
  // GAS環境
  const props = PropertiesService.getScriptProperties();
  return props ? props.getProperty(key) : null;
}
