export type JobName = "confluenceUpdateNotifyJob";

export interface JobExecutionRule {
  name: string;
  description?: string;
  executableConditions: JobExecutableCondition[];
}

export interface JobExecutableCondition {
  allowedDays: number[]; // 0: 日曜, 1: 月曜 ... 6: 土曜
  startHour: number; // 例: 8
  endHour: number; // 例: 19（19:00）
}

export type JobDataFileName = "confluence-update-notify-job.json" | "confluence-summary-job.json";

export type JobData = JobDataForUpdateJob | JobDataForSummaryJob;
export interface JobDataBase {
  timestamp: string;
}

export interface JobDataForUpdateJob extends JobDataBase {}

// JobData型を拡張して、ページ情報を追加した型
export interface JobDataForSummaryJob extends JobDataBase {
  originalVersions: Record<string, number>;
}

// JobData型かどうかを判定するType Guard関数
// biome-ignore lint/suspicious/noExplicitAny: JSONパース結果の型が不定のため
export function isJobData(data: any): data is JobData {
  if (typeof data !== "object" || data === null || typeof data.timestamp !== "string") {
    return false;
  }

  if ("originalVersions" in data) {
    return (
      typeof data.originalVersions === "object" &&
      data.originalVersions !== null &&
      Object.values(data.originalVersions).every((value) => typeof value === "number")
    );
  }

  return true;
}
