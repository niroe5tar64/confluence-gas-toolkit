export type PollingInfoFileName =
  | "confluence-update-notify-job.json"
  | "confluence-summary-job.json";

export interface PollingInfo {
  timestamp: string;
}

// PollingInfo型かどうかを判定するType Guard関数
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function isPollingInfo(data: any): data is PollingInfo {
  return (
    typeof data === "object" &&
    data !== null &&
    "timestamp" in data &&
    typeof data.timestamp === "string"
  );
}
