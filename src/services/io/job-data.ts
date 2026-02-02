import { IO_CONFIG } from "~/config";
import { isJobData, type JobData, type JobDataFileName } from "~/types";
import { createLogger, readFile, writeFile } from "~/utils";

const logger = createLogger("JobData");

/**
 * デフォルトのポーリング情報を生成する関数。
 * 主にポーリング情報の初期化やデフォルト値の設定に使用されます。
 *
 * @returns {JobData} - デフォルトのポーリング情報オブジェクト。
 */
function defaultJobData(): JobData {
  return {
    timestamp: new Date().toISOString(),
  };
}

/**
 * ポーリング情報を更新し、ファイルに保存する関数。
 *
 * 指定された部分的なポーリング情報 (`partialJobData`) を既存のデフォルトポーリング情報とマージし、
 * 結果を JSON ファイルに保存します。
 *
 * - デフォルトのポーリング情報は `defaultJobData` 関数で生成されます。
 * - 保存先のファイルは環境別ディレクトリ (`IO_CONFIG.dataDir`) 内の指定されたファイル名です。
 *
 * @param {Partial<JobData>} partialJobData - 更新するポーリング情報の一部。
 *   - 指定されたプロパティのみが既存の情報に上書きされます。
 * @param {JobDataFileName} fileName - 保存先のファイル名。
 *
 * @returns {void} - 戻り値はありません。
 *
 * @example
 * // ポーリング情報を更新
 * updateJobData({ timestamp: "2025-04-14T12:00:00Z" }, "example.json");
 */
export function updateJobData(partialJobData: Partial<JobData>, fileName: JobDataFileName): void {
  const jobData = { ...defaultJobData(), ...partialJobData };

  try {
    writeFile(`${IO_CONFIG.dataDir}/${fileName}`, JSON.stringify(jobData, null, 2));
    logger.debug("ジョブデータ書き込み成功", {
      fileName,
      timestamp: jobData.timestamp,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error("ジョブデータ書き込み失敗", error, {
        fileName,
        timestamp: jobData.timestamp,
      });
    }
    throw error;
  }
}

/**
 * ポーリング情報をファイルから読み取り、解析する関数。
 *
 * 指定されたファイル名から保存されたポーリング情報を読み取り、`JobData` 型として解析します。
 * ファイルの内容が `JobData` 型に適合しない場合は `null` を返します。
 *
 * - 保存先のファイルは環境別ディレクトリ (`IO_CONFIG.dataDir`) 内の指定されたファイル名です。
 * - ファイルが存在しない場合や内容が不正な場合は `null` を返します。
 *
 * @param {JobDataFileName} fileName - 読み取るポーリング情報のファイル名。
 *
 * @returns {JobData | null} - 解析されたポーリング情報。内容が不正または存在しない場合は `null`。
 *
 * @example
 * const jobData = parseJobData("example.json");
 * if (jobData) {
 *   console.log(`Last polling timestamp: ${jobData.timestamp}`);
 * } else {
 *   console.log("No valid polling info found.");
 * }
 */
export function parseJobData(fileName: JobDataFileName): JobData | null {
  try {
    const jobData = readFile(`${IO_CONFIG.dataDir}/${fileName}`);

    if (!isJobData(jobData)) {
      logger.warn("ジョブデータ形式不正、デフォルト値を使用", {
        fileName,
        reason: "invalid format",
      });
      return null;
    }

    logger.debug("ジョブデータ読み込み成功", {
      fileName,
      timestamp: jobData.timestamp,
    });
    return jobData;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    logger.warn("ジョブデータ読み込み失敗、デフォルト値を使用", {
      fileName,
      reason,
    });
    return null;
  }
}
