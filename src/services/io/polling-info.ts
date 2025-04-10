import { PollingInfo, isPollingInfo } from "~/types";
import { writeFile, readFile, formatDateJST } from "~/utils";

const POLING_INFO_FILE = "data/last-polling-info.json";

// TODO: 現状、ポーリング実行中にConfluenceが更新された場合、
//       その更新をSlackに通知できないので、最後に通知したページ情報などを追加して対応する。
export function updatePollingInfoService(): void {
  const pollingInfo = {
    timestamp: formatDateJST(),
    // lastNotifiedPage: null,
  };

  writeFile(POLING_INFO_FILE, JSON.stringify(pollingInfo, null, 2));
}

export function parsePollingInfoService(): PollingInfo | null {
  const pollingInfo = readFile(POLING_INFO_FILE);

  return isPollingInfo(pollingInfo) ? pollingInfo : null;
}
