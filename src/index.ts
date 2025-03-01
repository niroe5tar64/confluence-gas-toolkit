import { ConfluenceClient } from "~/clients";
import { getEnvVariable } from "~/utils";

const host = getEnvVariable("CONFLUENCE_URL") || "";
const personalAccessToken = getEnvVariable("CONFLUENCE_PAT") || "";

export async function debug() {
  const client = new ConfluenceClient(host, personalAccessToken);
  const pageInfo = await client.getPage({ pageId: "2317999845" });
  console.log(pageInfo);
}
