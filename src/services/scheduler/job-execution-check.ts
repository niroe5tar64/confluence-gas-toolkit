import { JobExecutableCondition, JobName } from "~/types";

import { jobExecutionPolicy } from "./job-schedule-config";

/**
 * 指定されたジョブが現在の日時に実行可能かどうかを判定する関数。
 *
 * ジョブ名に対応する実行ポリシー（`jobExecutionPolicy`）を参照し、
 * 現在の日時がそのポリシーの条件に一致するかを判定します。
 * ポリシーが未定義のジョブの場合は、常に実行可能（`true`）を返します。
 *
 * @param {JobName} jobName - 実行可能かどうかを判定するジョブの名前。
 *   - 例: `"confluenceUpdateNotifyJob"`
 * @returns {boolean} - ジョブが現在の日時に実行可能であれば `true`、そうでなければ `false`。
 *   ポリシー未定義の場合は常に `true`。
 *
 * @example
 * if (isJobExecutionAllowed("confluenceUpdateNotifyJob")) {
 *   console.log("ジョブを実行可能です。");
 * } else {
 *   console.log("現在はジョブを実行できません。");
 * }
 */
export function isJobExecutionAllowed(jobName: JobName) {
  const policy = jobExecutionPolicy[jobName];

  // ポリシーが未定義の場合は常に実行可能とする
  if (!policy) {
    return true;
  }

  const now = new Date();
  return policy.executableConditions.some((condition) =>
    isJobExecutionTime(now, condition),
  );
}

/**
 * 現在の日時が指定されたジョブの実行条件に一致するかを判定する関数。
 *
 * @param {Date} date - 判定対象の日時。
 * @param {JobExecutableCondition} condition - ジョブの実行条件。
 *   - `allowedDays`: 実行可能な曜日（0: 日曜日, 1: 月曜日, ..., 6: 土曜日）。
 *   - `startHour`: 実行可能な開始時刻（24時間制）。
 *   - `endHour`: 実行可能な終了時刻（24時間制）。
 * @returns {boolean} - 条件に一致する場合は `true`、そうでない場合は `false`。
 *
 * @example
 * const condition = { allowedDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 19 };
 * const now = new Date();
 * if (isJobExecutionTime(now, condition)) {
 *   console.log("現在の日時は条件に一致します。");
 * } else {
 *   console.log("現在の日時は条件に一致しません。");
 * }
 */
export function isJobExecutionTime(date: Date, condition: JobExecutableCondition): boolean {
  const day = date.getDay(); // 0: 日曜 ~ 6: 土曜
  const hour = date.getHours();
  const minutes = date.getMinutes();

  const isAllowedDay = condition.allowedDays.includes(day);

  const isWithinHours =
    (hour > condition.startHour && hour < condition.endHour) ||
    (hour === condition.startHour && minutes >= 0) ||
    (hour === condition.endHour && minutes === 0); // endHourちょうどを含める

  return isAllowedDay && isWithinHours;
}
