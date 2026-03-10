import { isLocalEnvironment } from "./env";

/**
 * 指定ミリ秒だけ待機する。
 * ローカル環境では Promise + setTimeout、GAS 環境では Utilities.sleep を使用する。
 *
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void> {
  if (isLocalEnvironment()) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // GAS: Utilities.sleep は同期的にブロックする
  Utilities.sleep(ms);
  return Promise.resolve();
}
