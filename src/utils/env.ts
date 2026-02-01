/**
 * 現在の実行環境がローカル（Node.js/Bun）かどうかを判定する。
 *
 * @returns {boolean} ローカル環境の場合は true、GAS 環境の場合は false
 */
export function isLocalEnvironment(): boolean {
  return typeof process !== "undefined" && process.env.TARGET !== "GAS";
}

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
  if (isLocalEnvironment()) {
    // ローカル環境 (Bun/Node.js)
    return process.env[key] || null;
  }
  // GAS環境
  const props = PropertiesService.getScriptProperties();
  return props ? props.getProperty(key) : null;
}
