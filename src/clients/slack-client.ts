import { getEnvVariable } from "~/utils";

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

  // 後方互換: 旧環境変数を DEFAULT として扱う
  const legacyUrl = getEnvVariable("SLACK_WEBHOOK_URL");
  if (legacyUrl) {
    return { DEFAULT: legacyUrl };
  }

  throw new Error("SLACK_WEBHOOK_URLS が設定されていません");
}

/**
 * 環境変数から Webhook URL マッピングを取得
 * 後方互換: SLACK_WEBHOOK_URLS が未設定の場合は SLACK_WEBHOOK_URL を DEFAULT として扱う
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
  const newClient = new SlackClient(url);
  clients.set(targetKey, newClient);
  return newClient;
}

export default class SlackClient extends HttpClient {
  private webhookUrl: string;

  /**
   * Slack クライアントを初期化
   * @param {string} webhookUrl - Slack Webhook URL
   * @deprecated 直接 new せず getSlackClient() を使用してください
   */
  constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  /**
   * SlackClient のシングルトンインスタンスを取得する。
   * @returns {SlackClient} - SlackClient のインスタンス
   * @throws {Error} このメソッドは廃止されました
   * @deprecated getSlackClient(targetKey) を使用してください
   */
  public static getInstance(): SlackClient {
    throw new Error(
      "getInstance() は廃止されました。getSlackClient(targetKey) を使用してください。",
    );
  }

  /**
   * Slack にカスタマイズ可能なメッセージを送信する
   * @param {object} payload - Slack メッセージのペイロード
   * @returns {Promise<boolean>} - 送信成功時に `true` を返す
   */
  async send(payload: object): Promise<boolean> {
    try {
      await this.httpRequest(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return true;
    } catch (error) {
      console.error("Slack メッセージ送信エラー:", error);
      return false;
    }
  }
}
