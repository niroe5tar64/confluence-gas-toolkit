import { PollingInfo, isPollingInfo } from "~/types";
import { writeFile, readFile } from "~/utils";

const POLING_INFO_FILE = "data/last-polling-info.json";

// TODO: ページ情報なども記録するように拡張予定
export function updatePollingInfoService(): void {
  const pollingInfo = {
    timestamp: new Date().toISOString(),
  };

  writeFile(POLING_INFO_FILE, JSON.stringify(pollingInfo, null, 2));
}

export function parsePollingInfoService(): PollingInfo | null {
  const pollingInfo = readFile(POLING_INFO_FILE);

  return isPollingInfo(pollingInfo) ? pollingInfo : null;
}
