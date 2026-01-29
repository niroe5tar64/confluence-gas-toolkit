import { getSlackClient } from "~/clients";
import { Slack } from "~/types";

/**
 * Slack にメッセージを送信するサービス関数。
 *
 * 指定されたペイロードを使用して、Slack Webhook 経由でメッセージを送信します。
 *
 * @param {Slack.MessagePayload} payload - Slack に送信するメッセージのペイロード。
 * @param {string} targetKey - 送信先キー（SLACK_ROUTE で定義）。省略時は "DEFAULT"
 * @returns {Promise<void>} - メッセージ送信が完了すると解決される Promise。
 *
 * @throws {Error} - Webhook URL が無効な場合や、送信に失敗した場合にエラーをスローします。（例外処理は未確認）
 *
 * @example
 * ```ts
 * const payload: Slack.MessagePayload = {
 *   text: "通知メッセージ",
 *   blocks: [
 *     {
 *       type: "section",
 *       text: {
 *         type: "mrkdwn",
 *         text: "新しい通知があります。",
 *       },
 *     },
 *   ],
 * };
 * await sendSlackMessage(payload, "update-notify");
 * ```
 */
export async function sendSlackMessage(payload: Slack.MessagePayload, targetKey = "DEFAULT") {
  const client = getSlackClient(targetKey);
  await client.send(payload);
}

/**
 * Slack に例外情報を通知する関数。
 *
 * 指定されたエラーオブジェクトのメッセージを含むペイロードを生成し、
 * Slack Webhook 経由で通知を送信します。
 *
 * @param {Error} error - 通知する例外オブジェクト。
 *   - `error.message` が Slack メッセージとして送信されます。
 * @param {string} targetKey - 送信先キー。省略時は "DEFAULT"
 * @returns {Promise<void>} - メッセージ送信が完了すると解決される Promise。
 *
 * @throws {Error} - Webhook URL が無効な場合や、送信に失敗した場合にエラーをスローします。
 *
 * @example
 * ```ts
 * try {
 *   // 何らかの処理
 *   throw new Error("予期しないエラーが発生しました。");
 * } catch (error) {
 *   await sendSlackException(error, "update-notify");
 * }
 * ```
 */
export async function sendSlackException(error: Error, targetKey = "DEFAULT") {
  const client = getSlackClient(targetKey);
  const payload = {
    blocks: [
      {
        type: "section",
        fields: [{ type: "plain_text", text: error.message }],
      },
    ],
  };
  await client.send(payload);
}
