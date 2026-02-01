---
paths:
  - "src/**/*.ts"
---

# アーキテクチャ（AI Agent向け）

## レイヤー構造

```
src/index.ts        → GASエントリーポイント（exportのみ）
src/use-case/       → ジョブオーケストレーション
  ├─ confluence-update-notify-job.ts → 更新個別通知
  ├─ confluence-update-summary-job.ts → 更新サマリー通知
  └─ confluence-create-notify-job.ts → 新規作成通知
src/services/       → ビジネスロジック
  ├─ confluence/    → Confluence API連携 & ページネーション
  ├─ slack/         → メッセージ送信
  ├─ confluence-slack/ → ペイロード変換（Confluence→Slack）
  ├─ scheduler/     → 実行可否判定ロジック
  └─ io/            → ジョブ状態の永続化
src/config/         → 設定ファイル
  ├─ job-schedule.ts → ジョブ実行スケジュール設定
  ├─ confluence-page-configs.ts → 監視対象ページ設定
  ├─ slack-routes.ts → Slack Webhook ルーティング
  └─ slack-messages.ts → Slack メッセージ文言
src/clients/        → APIクライアント（レジストリパターン）
  ├─ http-client.ts → デュアル環境対応基底クラス
  ├─ confluence-client.ts
  └─ slack-client.ts
src/types/          → 型定義
src/utils/          → ユーティリティ
```

## パスエイリアス

tsconfig.json & vite.config.ts で設定済み：
- `~/clients`, `~/config`, `~/services`, `~/types`, `~/use-case`, `~/utils`

## デュアル環境対応

コードはGASとローカル（Node.js/Bun）の両方で動作する。

### 環境判定
```typescript
// ローカル環境かどうかを判定（process.env.TARGET が "GAS" でなければローカル）
if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
  // ローカル環境
}
```

### 切り替えポイント
- `HttpClient`: GASでは`UrlFetchApp.fetch()`、ローカルでは`fetch()`
- `getEnvVariable()`: GASでは`PropertiesService`、ローカルでは`process.env`
- 状態永続化: GASではGoogle Drive、ローカルでは`data/*.json`

## データフロー

- 更新個別通知: スケジュール判定 → 変更ページ取得 → Slack送信 → タイムスタンプ更新
- 新規作成通知: スケジュール判定 → 変更ページから新規作成のみ抽出 → Slack送信 → タイムスタンプ更新
- 更新サマリー通知: 初回は全ページの版数を初期化 → 変更分をまとめてSlack送信 → 版数とタイムスタンプを保存

## 拡張時の注意

- 新クライアント追加: `src/clients/` に配置
- 新サービス追加: `src/services/<name>/` に配置、`index.ts`でre-export
- 新ジョブ追加: `src/use-case/` に配置、`src/index.ts`からexport
