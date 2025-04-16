import { PollingInfoFileName, PollingInfo, isPollingInfo } from "~/types";
import { writeFile, readFile } from "~/utils";

const POLING_INFO_DIR = "data"; // ポーリング情報を保存するファイル名

/**
 * デフォルトのポーリング情報を生成する関数。
 * 主にポーリング情報の初期化やデフォルト値の設定に使用されます。
 *
 * @returns {PollingInfo} - デフォルトのポーリング情報オブジェクト。
 */
function defaultPollingInfo(): PollingInfo {
  return {
    timestamp: new Date().toISOString(),
  };
}

/**
 * ポーリング情報を更新し、ファイルに保存する関数。
 *
 * 指定された部分的なポーリング情報 (`partialPollingInfo`) を既存のデフォルトポーリング情報とマージし、
 * 結果を JSON ファイルに保存します。
 *
 * - デフォルトのポーリング情報は `defaultPollingInfo` 関数で生成されます。
 * - 保存先のファイルは `POLING_INFO_DIR` ディレクトリ内の指定されたファイル名です。
 *
 * @param {Partial<PollingInfo>} partialPollingInfo - 更新するポーリング情報の一部。
 *   - 指定されたプロパティのみが既存の情報に上書きされます。
 * @param {PollingInfoFileName} fileName - 保存先のファイル名。
 *
 * @returns {void} - 戻り値はありません。
 *
 * @example
 * // ポーリング情報を更新
 * updatePollingInfo({ timestamp: "2025-04-14T12:00:00Z" }, "example.json");
 */
export function updatePollingInfo(
  partialPollingInfo: Partial<PollingInfo>,
  fileName: PollingInfoFileName,
): void {
  const pollingInfo = { ...defaultPollingInfo(), ...partialPollingInfo };

  writeFile(`${POLING_INFO_DIR}/${fileName}`, JSON.stringify(pollingInfo, null, 2));
}

/**
 * ポーリング情報をファイルから読み取り、解析する関数。
 *
 * 指定されたファイル名から保存されたポーリング情報を読み取り、`PollingInfo` 型として解析します。
 * ファイルの内容が `PollingInfo` 型に適合しない場合は `null` を返します。
 *
 * - 保存先のファイルは `POLING_INFO_DIR` ディレクトリ内の指定されたファイル名です。
 * - ファイルが存在しない場合や内容が不正な場合は `null` を返します。
 *
 * @param {PollingInfoFileName} fileName - 読み取るポーリング情報のファイル名。
 *
 * @returns {PollingInfo | null} - 解析されたポーリング情報。内容が不正または存在しない場合は `null`。
 *
 * @example
 * const pollingInfo = parsePollingInfo("example.json");
 * if (pollingInfo) {
 *   console.log(`Last polling timestamp: ${pollingInfo.timestamp}`);
 * } else {
 *   console.log("No valid polling info found.");
 * }
 */
export function parsePollingInfo(fileName: PollingInfoFileName): PollingInfo | null {
  try {
    const pollingInfo = readFile(`${POLING_INFO_DIR}/${fileName}`);

    return isPollingInfo(pollingInfo) ? pollingInfo : null;
  } catch (error) {
    return null;
  }
}
