# Slack複数チャンネル対応（Webhook活用）設計案

目的
- 既存のIncoming Webhook方式を維持したまま、用途に応じてチャンネルを使い分ける
- ルールで送信先を決定し、必要なら複数チャンネルへファンアウト

前提
- 現状は `SLACK_WEBHOOK_URL` 単一
- 送信は `SlackClient.getInstance()` のシングルトンで固定URLにPOST

提案概要
- Webhookをキー付きで複数保持する設定を追加
- ルーティングルールで「どの通知をどのチャンネルに送るか」を決定
- 送信関数に "送信先キー" を渡せるように拡張

構成（概念）
1) 設定
- `SLACK_WEBHOOK_URLS` : `key||url` を `,` 区切りで列挙
- `SLACK_ROUTE_RULES` : CSVでルール定義

例
```
SLACK_WEBHOOK_URLS=update-notify||https://hooks.slack.com/services/...,update-summary||https://hooks.slack.com/services/...,create-notify||https://hooks.slack.com/services/...
SLACK_ROUTE_RULES=job,spaceKey,titleContains,labelsAny,targets
confluenceUpdateNotifyJob,,,,"update-notify"
confluenceUpdateSummaryJob,,,,"update-notify"
confluenceCreateNotifyJob,,,,"create-notify"
```

2) ルーティング
- `routeSlackTargets(context)` が `string[]` を返す
- `context` はジョブ種別、spaceKey、ページタイトル、labels等を含む
- ルールに合致したら `to` を追加（複数可）
- 合致が0件なら `DEFAULT` を返す

3) 送信
- `sendSlackMessage(payload, { targetKeys?: string[] })`
- `targetKeys` が未指定なら router の結果を使う
- キーに紐づくWebhook URLへ順次POST（ファンアウト）

変更点（ファイル粒度の目安）
- `src/clients/slack-client.ts`
  - シングルトンを廃止 or URL指定で都度生成
  - `getInstance(webhookUrl: string)` 方式に変更
- `src/services/slack/slack-message.ts`
  - 送信先キーの解決（router呼び出し or 直接指定）
- `src/services/slack/slack-router.ts` (新規)
  - ルーティングロジック
- `src/utils/env.ts` or `getEnvVariable`周辺
  - `key||url` パース + CSV読み込みのヘルパー

ルールマッチ条件（最小セット）
- `job`: "notify" / "summary" など
- `spaceKey`: Confluenceスペース
- `titleContains`: ページタイトルの部分一致
- `labelsAny`: ラベルのいずれか一致
- `targets`: `|` 区切りで複数指定可能

フォールバック
- ルール不一致は許容しない（必ずルールを設定）
- ルール一致したがURL未定義 → ログ出力しスキップ

エラーハンドリング
- 1つのWebhook送信失敗で全体を止めない
- 失敗は `console.error` に記録

移行手順（段階的）
1) 既存 `SLACK_WEBHOOK_URL` を `SLACK_WEBHOOK_URL_DEFAULT` へ移行
2) ルーティングを導入（デフォルトのみ）
3) ルール/複数Webhookを追加

メリット
- 既存運用を崩さず導入可能
- ルールが設定ファイルに集約され運用しやすい
- 新しいチャンネル追加が低コスト

注意点
- CSVはScript Propertiesに複数行で保存する（改行をそのまま保持）
- GAS側での環境変数サイズ制限（過度なルール数に注意）
 - ルールの評価順序は重要ではない前提（マッチしたターゲットを重複排除して送信）
