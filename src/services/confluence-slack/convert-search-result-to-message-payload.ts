import { Confluence, Slack } from "~/types";
import { formatDateJST, getEnvVariable } from "~/utils";

export function convertSearchResultToMessagePayload(
  searchResult: Confluence.SearchResult,
  baseUrl: string,
): Slack.MessagePayload {
  const { id, title, version } = searchResult;

  if (!version || version.number < 2) {
    return { blocks: [] };
  }

  const pageUrl = `${baseUrl}/pages/viewpage.action?pageId=${id}`;
  const diffQuery = new URLSearchParams({
    pageId: id,
    originalVersion: String(version.number - 1),
    revisedVersion: String(version.number),
  });
  const diffUrl = `${baseUrl}/pages/diffpagesbyversion.action?${diffQuery}`;
  const updatedAt = formatDateJST(version.when);

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: getEnvVariable("SLACK_HEADER_TEXT") || "Confluence-Slack通知",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Page:*\n<${pageUrl}|${title}> (<${diffUrl}|diff>)`,
          },
          {
            type: "mrkdwn",
            text: `*Updated by:* ${version.by.displayName}\n*Updated at:* ${updatedAt}`,
          },
        ],
      },
    ],
  };
}
