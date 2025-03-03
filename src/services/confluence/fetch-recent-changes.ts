import { ConfluenceClient } from "~/clients";
import { Confluence } from "~/types";
import { getEnvVariable } from "~/utils";

const host = getEnvVariable("CONFLUENCE_URL") || "";
const personalAccessToken = getEnvVariable("CONFLUENCE_PAT") || "";
const spaceKey = getEnvVariable("SPACE_KEY") || "";
const rootPageId = getEnvVariable("ROOT_PAGE_ID") || "";

export async function fetchRecentChangesService(
  timestamp?: string | null,
): Promise<Confluence.SearchPage> {
  const client = new ConfluenceClient(host, personalAccessToken, spaceKey, rootPageId);
  const extraCql = timestamp
    ? `lastModified > ${timestamp} ORDER BY lastModified DESC` // 指定した日時以降に変更されたページを取得
    : "lastModified > now('-15m') ORDER BY lastModified DESC"; // 日時指定がない場合は直近15分間に変更されたページを取得

  return await client.getSearchPage({ extraCql });
}
