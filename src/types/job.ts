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
