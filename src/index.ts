import { ConfluenceClient } from "~/clients";
import { getEnvVariable } from "~/utils";

const host = getEnvVariable("CONFLUENCE_URL") || "";
const personalAccessToken = getEnvVariable("CONFLUENCE_PAT") || "";
const spaceKey = getEnvVariable("SPACE_KEY") || "";
const rootPageId = getEnvVariable("CONFLUENCE_PAT") || "";

export async function debug() {
  const client = new ConfluenceClient(host, personalAccessToken, spaceKey, rootPageId);
  const pageInfo = await client.getPage({ pageId: "2317999845" });
  console.log(pageInfo);

  console.log("****************************");
  const result = await client.getSearchPage({
    extraCql: "lastModified >= now('-7d') ORDER BY lastModified DESC",
    option: { limit: 1, start: 2 },
  });
  console.log(result);
}
