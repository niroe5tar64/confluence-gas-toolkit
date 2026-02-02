/**
 * 現在の実行環境がローカル（Node.js/Bun）かどうかを判定する。
 *
 * @returns {boolean} ローカル環境の場合は true、GAS 環境の場合は false
 */
export function isLocalEnvironment(): boolean {
  return typeof process !== "undefined" && process.env.TARGET !== "GAS";
}

/** アプリケーション環境の型 */
export type AppEnv = "dev" | "prod";

/**
 * 現在のアプリケーション環境を取得する。
 *
 * - GAS環境: ビルド時に埋め込まれた `process.env.APP_ENV` を返す
 * - ローカル環境: `process.env.APP_ENV` を返す（未設定時は "dev"）
 *
 * @returns {AppEnv} "prod" または "dev"
 */
export function getAppEnv(): AppEnv {
  return process.env.APP_ENV === "prod" ? "prod" : "dev";
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
