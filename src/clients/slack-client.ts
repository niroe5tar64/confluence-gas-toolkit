import { getEnvVariable } from "~/utils";

import HttpClient from "./http-client";

// Webhook URL のキャッシュ
let webhookUrls: Record<string, string> | null = null;

/**
 * 環境変数から Webhook URL マッピングを取得
 * 後方互換: SLACK_WEBHOOK_URLS が未設定の場合は SLACK_WEBHOOK_URL を DEFAULT として扱う
 */
function getWebhookUrls(): Record<string, string> {
  if (!webhookUrls) {
    const raw = getEnvVariable("SLACK_WEBHOOK_URLS");
    if (raw) {
      webhookUrls = JSON.parse(raw);
    } else {
      // 後方互換: 旧環境変数を DEFAULT として扱う
      const legacyUrl = getEnvVariable("SLACK_WEBHOOK_URL");
      if (legacyUrl) {
        webhookUrls = { DEFAULT: legacyUrl };
      } else {
        throw new Error("SLACK_WEBHOOK_URLS が設定されていません");
      }
    }
  }
  return webhookUrls;
}

// クライアントインスタンスのレジストリ
const clients = new Map<string, SlackClient>();

/**
 * テスト用: キャッシュをリセット
 * @internal
 */
export function resetSlackClientCache(): void {
  webhookUrls = null;
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
  private static instance: SlackClient | null = null;

  private webhookUrl: string;

  /**
   * Slack クライアントを初期化
   * @param {string} webhookUrl - Slack Webhook URL
   */
  constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  /**
   * SlackClient のシングルトンインスタンスを取得する。
   *
   * 初回呼び出し時にインスタンスを生成し、以降は同じインスタンスを返す。
   * 環境変数から必要な設定値を取得してインスタンスを初期化する。
   *
   * @returns {SlackClient} - SlackClient のシングルトンインスタンス
   * @throws {Error} - SLACK_WEBHOOK_URL 環境変数が設定されていない場合にスローされる
   */
  public static getInstance(): SlackClient {
    if (!SlackClient.instance) {
      const webhookUrl = getEnvVariable("SLACK_WEBHOOK_URL") || "";
      if (!webhookUrl) {
        throw new Error("SLACK_WEBHOOK_URL 環境変数が設定されていません。");
      }
      SlackClient.instance = new SlackClient(webhookUrl);
    }
    return SlackClient.instance;
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
