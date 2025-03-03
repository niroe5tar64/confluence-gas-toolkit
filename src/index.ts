import { ConfluenceClient } from "~/clients";
import { getEnvVariable, writeFile, readFile } from "~/utils";

const host = getEnvVariable("CONFLUENCE_URL") || "";
const personalAccessToken = getEnvVariable("CONFLUENCE_PAT") || "";
const spaceKey = getEnvVariable("SPACE_KEY") || "";
const rootPageId = getEnvVariable("CONFLUENCE_PAT") || "";

export async function debug() {
  const client = new ConfluenceClient(host, personalAccessToken, spaceKey, rootPageId);
  // const pageInfo = await client.getPage({ pageId: "2317999845" });
  // console.log(pageInfo);

  // console.log("****************************");
  // const result = await client.getSearchPage({
  //   extraCql: "lastModified >= now('-7d') ORDER BY lastModified DESC",
  //   option: { limit: 1, start: 2 },
  // });
  // console.log(result);

  // console.log("****************************");

  // 書き込み
  writeFile("data/debug.log", "Line 1\nLine 2\nLine 3");

  // 読み込み
  const content = readFile("data/debug.log");
  console.log(content);
}
