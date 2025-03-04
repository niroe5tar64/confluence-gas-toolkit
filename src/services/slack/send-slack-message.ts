import { Slack } from "src/types/slack";
import { SlackClient } from "~/clients";
import { getEnvVariable } from "~/utils";

const webhookUrl = getEnvVariable("SLACK_WEBHOOK_URL") || "";

export function sendSlackMessageService(payload: Slack.MessagePayload) {
  const client = new SlackClient(webhookUrl);
  client.send(payload);
}
