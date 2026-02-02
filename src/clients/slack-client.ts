import { createLogger, getEnvVariable } from "~/utils";

import HttpClient from "./http-client";

// Webhook URL のキャッシュ
let cachedWebhookUrls: Record<string, string> | null = null;

/**
 * 値が Record<string, string> 型かどうかを検証
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

/**
 * 環境変数から Webhook URL マッピングを初期化
 */
function initializeWebhookUrls(): Record<string, string> {
  const raw = getEnvVariable("SLACK_WEBHOOK_URLS");
  if (raw) {
    const parsed: unknown = JSON.parse(raw);

    if (!isStringRecord(parsed)) {
      throw new Error("SLACK_WEBHOOK_URLS の形式が不正です");
    }

    return parsed;
  }

  throw new Error("必須環境変数が未設定です: SLACK_WEBHOOK_URLS");
}

/**
 * 環境変数から Webhook URL マッピングを取得
 */
function getWebhookUrls(): Record<string, string> {
  if (!cachedWebhookUrls) {
    cachedWebhookUrls = initializeWebhookUrls();
  }
  return cachedWebhookUrls;
}

// クライアントインスタンスのレジストリ
const clients = new Map<string, SlackClient>();

/**
 * テスト用: キャッシュをリセット
 * @internal
 */
export function resetSlackClientCache(): void {
  cachedWebhookUrls = null;
  clients.clear();
}

/**
 * 指定されたターゲットキーに対応する SlackClient を取得
 * @param targetKey - SLACK_ROUTE で定義されたキー（例: "update-notify"）
 */
export function getSlackClient(targetKey: string): SlackClient {
  const existingClient = clients.get(targetKey);
  if (existingClient) {
    return existingClient;
  }

  const urls = getWebhookUrls();
  const url = urls[targetKey];
  if (!url) {
    throw new Error(`Webhook URL が見つかりません: ${targetKey}`);
  }
  const newClient = new SlackClient(url, targetKey);
  clients.set(targetKey, newClient);
  return newClient;
}

export default class SlackClient extends HttpClient {
  private webhookUrl: string;
  private readonly targetKey: string;
  private logger = createLogger("SlackClient");

  /**
   * Slack クライアントを初期化
   * @param {string} webhookUrl - Slack Webhook URL
   * @param {string} targetKey - SLACK_ROUTE で定義されたキー
   * @deprecated 直接 new せず getSlackClient() を使用してください
   */
  constructor(webhookUrl: string, targetKey = "DEFAULT") {
    super();
    this.webhookUrl = webhookUrl;
    this.targetKey = targetKey;
  }

  /**
   * Slack にカスタマイズ可能なメッセージを送信する
   * @param {object} payload - Slack メッセージのペイロード
   * @param payloadSummary - ログ用の概要情報
   * @returns {Promise<void>} - 送信成功時に解決される Promise
   */
  async send(
    payload: object,
    payloadSummary?: { type?: string; pageCount?: number; firstPageTitle?: string },
  ): Promise<void> {
    let status: number | undefined;
    let loggedError = false;
    this.logger.debug("メッセージ送信開始", { targetKey: this.targetKey });

    try {
      const response = await this.httpRequest(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if ("ok" in response) {
        status = response.status;
        if (!response.ok) {
          const error = new Error(
            `Slack送信失敗: ${response.status} ${response.statusText}`.trim(),
          );
          this.logger.error("メッセージ送信失敗", error, {
            targetKey: this.targetKey,
            status,
            payloadSummary,
          });
          loggedError = true;
          throw error;
        }
        this.logger.info("メッセージ送信完了", { targetKey: this.targetKey });
        return;
      }

      if ("getResponseCode" in response) {
        status = response.getResponseCode();
        if (status >= 400) {
          const error = new Error(`Slack送信失敗: ${status}`);
          this.logger.error("メッセージ送信失敗", error, {
            targetKey: this.targetKey,
            status,
            payloadSummary,
          });
          loggedError = true;
          throw error;
        }
        this.logger.info("メッセージ送信完了", { targetKey: this.targetKey });
      }
    } catch (error) {
      if (!loggedError && error instanceof Error) {
        this.logger.error("メッセージ送信失敗", error, {
          targetKey: this.targetKey,
          status,
          payloadSummary,
        });
      }
      throw error;
    }
  }
}
