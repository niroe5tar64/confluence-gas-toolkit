export type PollingInfoFileName =
  | "confluence-update-notify-job.json"
  | "confluence-summary-job.json";

export type PollingInfo = PollingInfoForUpdateJob | PollingInfoForSummaryJob;
export interface PollingInfoBase {
  timestamp: string;
}

export interface PollingInfoForUpdateJob extends PollingInfoBase {}

// TODO: 型名などを精査する。
// PollingInfo型を拡張して、ページ情報を追加した型
export interface PollingInfoForSummaryJob extends PollingInfoBase {
  originalVersions: Record<string, number>;
}

// PollingInfo型かどうかを判定するType Guard関数
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function isPollingInfo(data: any): data is PollingInfo {
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
