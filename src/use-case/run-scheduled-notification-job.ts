import {
  fetchRecentChangesService,
  sendSlackMessageService,
  parsePollingInfoService,
  updatePollingInfoService,
  convertSearchResultToMessagePayload,
} from "~/services";
import { Confluence } from "~/types";

export async function runScheduledNotificationJob() {
  const pollingInfo = parsePollingInfoService();
  const recentChangePages = await fetchRecentChangesService(pollingInfo?.timestamp);

  const baseUrl = recentChangePages._links.base;
  recentChangePages.results.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayload(result, baseUrl);
    await sendSlackMessageService(payload);
  });
  updatePollingInfoService();
}
