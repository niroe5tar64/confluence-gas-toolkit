import { RichTextElement as SlackRichTextElement } from "@slack/types";
import type { IncomingWebhookSendArguments } from "@slack/webhook";

/**
 * Slack Webhook 用のメッセージペイロードの型定義。
 *
 * `IncomingWebhookSendArguments` は、Slack の `IncomingWebhook` クラスで利用される引数を定義した型。
 * これを継承することで、Slack Webhook 経由で送信するメッセージの構造を型安全に利用できる。
 *
 * 参考:
 * - Slack SDK - IncomingWebhook クラスのドキュメント
 *   https://tools.slack.dev/node-slack-sdk/reference/webhook/classes/IncomingWebhook
 */
export namespace Slack {
  export type RichTextElement = SlackRichTextElement;
  export interface MessagePayload extends IncomingWebhookSendArguments {}
}
