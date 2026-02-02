import type { JobName } from "~/types";
import type { PageConfig } from "./confluence-page-configs";

/**
 * 値が PageConfig 型かどうかを検証
 */
export function isPageConfig(value: unknown): value is PageConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    "rootPageIds" in value &&
    Array.isArray((value as PageConfig).rootPageIds) &&
    (value as PageConfig).rootPageIds.every((id) => typeof id === "string") &&
    "spaceKey" in value &&
    typeof (value as PageConfig).spaceKey === "string"
  );
}

/**
 * 値が Record<JobName, PageConfig> 型かどうかを検証
 */
export function isPageConfigRecord(value: unknown): value is Record<JobName, PageConfig> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const jobNames: JobName[] = [
    "confluenceUpdateNotifyJob",
    "confluenceUpdateSummaryJob",
    "confluenceCreateNotifyJob",
  ];
  return jobNames.every((jobName) => jobName in record && isPageConfig(record[jobName]));
}

/**
 * ページ設定を検証し、有効な設定を返す
 *
 * @param configs - 検証対象の設定値
 * @returns 検証済みのページ設定
 * @throws {Error} 設定が未設定または不正な形式の場合
 */
export function validatePageConfigs(
  configs: Record<JobName, PageConfig> | null | undefined,
): Record<JobName, PageConfig> {
  if (!configs) {
    throw new Error("CONFLUENCE_PAGE_CONFIGS が未設定です");
  }

  if (!isPageConfigRecord(configs)) {
    throw new Error("CONFLUENCE_PAGE_CONFIGS の形式が不正です");
  }

  return configs;
}
