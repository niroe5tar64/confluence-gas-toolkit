# Slack複数チャンネル対応 設計案

## 目的

- 既存のIncoming Webhook方式を維持したまま、ジョブごとに送信先チャンネルを分ける
- シンプルな1:1マッピングで実装コストを最小化

## 前提

- ルール変更頻度: 初期設定後はほぼ固定
- 同時送信: 1通知→1チャンネル（ファンアウト不要）
- 現状: `SLACK_WEBHOOK_URL` 単一、`SlackClient` シングルトン

## 設計概要

```
ジョブ → 送信先キー → Webhook URL（1:1:1マッピング）
```

### 構成図

```
use-case/
  └─ confluence-update-notify-job.ts
       │
       │ targetKey = SLACK_ROUTE.confluenceUpdateNotifyJob
       ▼
services/slack/
  └─ slack-message.ts
       │ sendSlackMessage(payload, targetKey)
       ▼
clients/
  └─ slack-client.ts
       │ getSlackClient(targetKey)
       │   → webhookUrls[targetKey]
       ▼
    Slack Webhook POST
```

## 実装詳細

### 1. ルーティング設定（TypeScript）

```typescript
// src/config/slack-routes.ts
import type { JobName } from "~/types";

// JobName に新しいジョブを追加すると、ここに設定しないとコンパイルエラーになる
export const SLACK_ROUTE: Record<JobName, string> = {
  confluenceUpdateNotifyJob: "update-notify",
  confluenceUpdateSummaryJob: "update-summary",
  confluenceCreateNotifyJob: "create-notify",
};
```

### 2. Webhook URL 設定（環境変数）

```
SLACK_WEBHOOK_URLS={"update-notify":"https://hooks.slack.com/services/...","update-summary":"https://hooks.slack.com/services/...","create-notify":"https://hooks.slack.com/services/..."}
```

- JSON形式で1つの環境変数に格納
- GASでは Script Properties に設定

### 3. SlackClient（レジストリパターン）

```typescript
// src/clients/slack-client.ts
import { getEnvVariable } from "~/utils";
import HttpClient from "./http-client";

// Webhook URL のキャッシュ
let webhookUrls: Record<string, string> | null = null;

function getWebhookUrls(): Record<string, string> {
  if (!webhookUrls) {
    const raw = getEnvVariable("SLACK_WEBHOOK_URLS") || "{}";
    webhookUrls = JSON.parse(raw);
  }
  return webhookUrls;
}

// クライアントインスタンスのレジストリ
const clients = new Map<string, SlackClient>();

export function getSlackClient(targetKey: string): SlackClient {
  if (!clients.has(targetKey)) {
    const urls = getWebhookUrls();
    const url = urls[targetKey];
    if (!url) {
      throw new Error(`Webhook URL が見つかりません: ${targetKey}`);
    }
    clients.set(targetKey, new SlackClient(url));
  }
  return clients.get(targetKey)!;
}

export default class SlackClient extends HttpClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

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
```

### 4. 送信関数

```typescript
// src/services/slack/slack-message.ts
import { getSlackClient } from "~/clients";
import type { Slack } from "~/types";

export async function sendSlackMessage(
  payload: Slack.MessagePayload,
  targetKey: string
) {
  const client = getSlackClient(targetKey);
  await client.send(payload);
}

export async function sendSlackException(error: Error, targetKey: string) {
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
```

### 5. ジョブ側の呼び出し

```typescript
// src/use-case/confluence-update-notify-job.ts
import { SLACK_ROUTE } from "~/config/slack-routes";
import { sendSlackMessage } from "~/services/slack";

const TARGET_KEY = SLACK_ROUTE.confluenceUpdateNotifyJob;

// ... ジョブ処理 ...

await sendSlackMessage(payload, TARGET_KEY);
```

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/config/slack-routes.ts` | 新規: ジョブ→キーのマッピング |
| `src/types/job.ts` | `JobName` 型に全ジョブを追加 |
| `src/clients/slack-client.ts` | シングルトン→レジストリパターンに変更 |
| `src/clients/index.ts` | `getSlackClient` をエクスポート |
| `src/services/slack/slack-message.ts` | `targetKey` 引数を追加 |
| `src/use-case/*.ts` | 送信時に `targetKey` を渡す |

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SLACK_WEBHOOK_URLS` | JSON形式のキー→URL マッピング | `{"update-notify":"https://..."}` |
| `SLACK_WEBHOOK_URL` | （後方互換用、将来削除） | `https://...` |

## 移行手順

1. `SLACK_WEBHOOK_URLS` 環境変数を追加（既存URLをキー付きで設定）
2. コード変更をデプロイ
3. 動作確認後、`SLACK_WEBHOOK_URL` を削除

## 後方互換性（オプション）

移行期間中、`SLACK_WEBHOOK_URLS` が未設定の場合は `SLACK_WEBHOOK_URL` にフォールバック:

```typescript
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
```

## 不採用とした案

### CSV ルーティング

当初検討したが、以下の理由で不採用:

- GAS の PropertiesService に 9KB 制限がある
- パースエラーのデバッグが困難
- ルール変更頻度が低いため、TypeScript で十分

### ファンアウト送信

1通知→複数チャンネルの同時送信は不要なため、実装しない。
