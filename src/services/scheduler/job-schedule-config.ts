import { JobExecutionRule } from "~/types";

/**
 * ジョブの実行ポリシーを定義するオブジェクト。
 *
 * 各ジョブに対して、実行可能な条件（曜日や時間帯など）を設定します。
 * この設定はスケジューラーがジョブを実行する際のルールとして使用されます。
 *
 * @type {Record<string, JobExecutionRule>}
 *
 * @property {string} name - ジョブの名前。
 * @property {string} description - ジョブの説明。
 * @property {Array<{ allowedDays: number[], startHour: number, endHour: number }>} executableConditions - 実行可能条件の配列。
 *   - `allowedDays`: 実行可能な曜日（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）。
 *   - `startHour`: 実行可能な開始時刻（24時間制）。
 *   - `endHour`: 実行可能な終了時刻（24時間制）。
 */
export const jobExecutionPolicy: Record<string, JobExecutionRule> = {
  confluenceUpdateNotifyJob: {
    name: "Confluence更新通知JOBの設定",
    description: "平日 8:00 ~ 19:00",
    executableConditions: [
      {
        allowedDays: [1, 2, 3, 4, 5],
        startHour: 8,
        endHour: 19,
      },
    ],
  },
};
