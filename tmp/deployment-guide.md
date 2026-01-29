# Slack複数チャンネル対応 デプロイ手順書

設計ドキュメント: `tmp/slack-routing-design.md`
実装手順書: `tmp/slack-routing-implementation-guide.md`

---

## 概要

この手順書では、Slack複数チャンネル対応の実装を実際の環境に適用する手順を説明します。

### 環境構成

| 環境 | 用途 | 設定ファイル | デプロイコマンド |
|------|------|-------------|-----------------|
| 開発 | テスト・検証用 | `.clasp-dev.json` | `bun run push` |
| 本番 | 実運用 | `.clasp-prod.json` | `bun run push:prod` |

### 変更の影響範囲

- **新規環境変数**: `SLACK_WEBHOOK_URLS`（JSON形式）
- **既存環境変数**: `SLACK_WEBHOOK_URL`（後方互換のため残存）
- **影響ジョブ**:
  - `confluenceUpdateNotifyJob`
  - `confluenceUpdateSummaryJob`
  - `confluenceCreateNotifyJob`（ページ新規作成通知）

---

## Phase 1: 事前確認

### 1.1 ビルド確認

```bash
bun run build
```

✅ エラーなく完了すること

### 1.2 Lint確認

```bash
bunx biome check .
```

✅ エラーなく完了すること

### 1.3 テスト確認

```bash
bun test
```

✅ 全テストがパスすること

---

## Phase 2: Slack Webhook URL の準備

### 2.1 Slack Appの設定

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 既存のAppを選択（または新規作成）
3. 左メニュー「Incoming Webhooks」をクリック
4. 「Add New Webhook to Workspace」をクリック
5. 送信先チャンネルを選択して許可

### 2.2 必要なWebhook URL

以下の3つのWebhook URLを準備します（チャンネルが同じ場合は同じURLでOK）:

| キー | 用途 | 送信先チャンネル（例） |
|------|------|---------------------|
| `update-notify` | ページ更新通知 | `#confluence-updates` |
| `update-summary` | 更新サマリー | `#confluence-summary` |
| `create-notify` | 新規作成通知 | `#confluence-new-pages` |

### 2.3 JSON形式で整形

取得したURLを以下の形式で整形します:

```json
{
  "update-notify": "<SLACK_WEBHOOK_URL_UPDATE_NOTIFY>",
  "update-summary": "<SLACK_WEBHOOK_URL_UPDATE_SUMMARY>",
  "create-notify": "<SLACK_WEBHOOK_URL_CREATE_NOTIFY>"
}
```

> **注意**: 実際に設定する際は改行なしの1行JSONにします

---

## Phase 3: 開発環境へのデプロイ

### 3.1 ローカル環境変数の更新

`.env` ファイルを更新:

```bash
# 既存の設定はそのまま
CONFLUENCE_PAT=...
CONFLUENCE_URL=...
SPACE_KEY=...
ROOT_PAGE_ID=...
SLACK_HEADER_TEXT=...

# 旧形式（後方互換のため残す）
SLACK_WEBHOOK_URL=<SLACK_WEBHOOK_URL_LEGACY>

# 新形式（追加）
SLACK_WEBHOOK_URLS={"update-notify":"<SLACK_WEBHOOK_URL_UPDATE_NOTIFY>","update-summary":"<SLACK_WEBHOOK_URL_UPDATE_SUMMARY>","create-notify":"<SLACK_WEBHOOK_URL_CREATE_NOTIFY>"}
```

### 3.2 開発環境へpush

```bash
bun run push
```

✅ `Pushed N files.` と表示されること

### 3.3 GASエディタを開く

```bash
bun run open
```

ブラウザでGASエディタが開きます。

---

## Phase 4: GAS Script Properties の設定

### 4.1 プロジェクト設定を開く

1. GASエディタの左メニュー「⚙️ プロジェクトの設定」をクリック
2. 「スクリプト プロパティ」セクションまでスクロール
3. 「スクリプト プロパティを追加」をクリック

### 4.2 既存プロパティの確認

以下のプロパティが設定されていることを確認:

| プロパティ | 説明 |
|-----------|------|
| `CONFLUENCE_PAT` | Confluence Personal Access Token |
| `CONFLUENCE_URL` | Confluence ベースURL |
| `SPACE_KEY` | 監視対象スペースキー |
| `ROOT_PAGE_ID` | 監視対象ルートページID |
| `SLACK_HEADER_TEXT` | Slack通知ヘッダーテキスト |
| `SLACK_WEBHOOK_URL` | 旧Webhook URL |

### 4.3 新規プロパティの追加

以下のプロパティを**追加**:

| プロパティ | 値 |
|-----------|-----|
| `SLACK_WEBHOOK_URLS` | `{"update-notify":"<SLACK_WEBHOOK_URL_UPDATE_NOTIFY>","update-summary":"<SLACK_WEBHOOK_URL_UPDATE_SUMMARY>","create-notify":"<SLACK_WEBHOOK_URL_CREATE_NOTIFY>"}` |

> **重要**: JSON値は1行で入力してください。改行があるとパースエラーになります。

### 4.4 保存

「スクリプト プロパティを保存」をクリック

---

## Phase 5: トリガーの設定

### 5.1 トリガー画面を開く

1. GASエディタの左メニュー「⏰ トリガー」をクリック
2. 現在のトリガー一覧を確認

### 5.2 既存トリガーの確認

以下のトリガーが設定されているはず:

| 関数名 | イベントソース | 頻度 |
|--------|--------------|------|
| `confluenceUpdateNotifyJob` | 時間主導型 | 例: 5分おき |
| `confluenceUpdateSummaryJob` | 時間主導型 | 例: 毎日9:00 |

### 5.3 新規トリガーの追加（必要な場合）

`confluenceCreateNotifyJob` を追加する場合:

1. 「トリガーを追加」をクリック
2. 以下を設定:
   - **実行する関数**: `confluenceCreateNotifyJob`
   - **イベントのソース**: `時間主導型`
   - **時間ベースのトリガーのタイプ**: `分ベースのタイマー`
   - **時間の間隔**: `5分おき`（例）
3. 「保存」をクリック

---

## Phase 6: 動作確認（開発環境）

### 6.1 手動実行テスト

1. GASエディタで関数を選択
2. 「▶ 実行」をクリック
3. 初回は権限承認が必要

#### テスト順序

```
1. confluenceUpdateNotifyJob   → update-notify チャンネルに送信されること
2. confluenceUpdateSummaryJob  → update-summary チャンネルに送信されること
3. confluenceCreateNotifyJob   → create-notify チャンネルに送信されること
```

### 6.2 確認項目

- [ ] 各ジョブが正しいチャンネルにメッセージを送信している
- [ ] エラーが発生していない（実行ログを確認）
- [ ] 既存の通知フォーマットが変わっていない

### 6.3 エラー時の対処

#### JSON パースエラー

```
Error: Unexpected token ...
```

→ `SLACK_WEBHOOK_URLS` の JSON形式を確認。ダブルクォートのエスケープ、改行の有無をチェック。

#### Webhook URL が見つからない

```
Error: Webhook URL が見つかりません: update-notify
```

→ `SLACK_WEBHOOK_URLS` に該当キーが含まれているか確認。

#### 後方互換フォールバック確認

`SLACK_WEBHOOK_URLS` を一時的に削除して、`SLACK_WEBHOOK_URL` で動作することを確認。

---

## Phase 7: 本番環境へのデプロイ

### 7.1 本番用 clasp 設定の確認

`.clasp-prod.json` の `scriptId` が本番プロジェクトを指していることを確認。

### 7.2 本番環境へpush

```bash
bun run push:prod
```

### 7.3 本番GASエディタを開く

```bash
bun run open:prod
```

### 7.4 Script Properties の設定

Phase 4 と同様の手順で、本番環境の Script Properties を設定。

### 7.5 トリガーの確認・設定

Phase 5 と同様の手順で、本番環境のトリガーを確認・設定。

### 7.6 動作確認

Phase 6 と同様の手順で動作確認。

---

## Phase 8: 移行完了後のクリーンアップ（任意）

本番環境で十分な稼働実績が得られたら:

### 8.1 旧環境変数の削除

GAS Script Properties から `SLACK_WEBHOOK_URL` を削除。

### 8.2 コードの後方互換ロジック削除

`src/clients/slack-client.ts` から後方互換フォールバック部分を削除:

```typescript
// 削除対象
const legacyUrl = getEnvVariable("SLACK_WEBHOOK_URL");
if (legacyUrl) {
  webhookUrls = { DEFAULT: legacyUrl };
}
```

### 8.3 .env.sample の更新

```env
# 旧形式（削除）
# SLACK_WEBHOOK_URL=...

# 新形式
SLACK_WEBHOOK_URLS={"update-notify":"<SLACK_WEBHOOK_URL_UPDATE_NOTIFY>","update-summary":"<SLACK_WEBHOOK_URL_UPDATE_SUMMARY>","create-notify":"<SLACK_WEBHOOK_URL_CREATE_NOTIFY>"}
```

---

## ロールバック手順

問題が発生した場合の復旧手順:

### 即時ロールバック（コード変更なし）

1. GAS Script Properties から `SLACK_WEBHOOK_URLS` を削除
2. `SLACK_WEBHOOK_URL` が設定されていることを確認
3. 後方互換ロジックにより、全ジョブが `SLACK_WEBHOOK_URL` に送信される

### 完全ロールバック（コードを戻す）

1. gitで前のコミットに戻す:
   ```bash
   git log --oneline  # コミットIDを確認
   git checkout <commit-id> -- src/
   ```

2. 再デプロイ:
   ```bash
   bun run push       # 開発
   bun run push:prod  # 本番
   ```

---

## チェックリスト

### デプロイ前

- [ ] `bun run build` 成功
- [ ] `bunx biome check .` 成功
- [ ] `bun test` 成功
- [ ] Slack Webhook URL 3つ準備済み

### 開発環境

- [ ] `bun run push` 成功
- [ ] Script Properties に `SLACK_WEBHOOK_URLS` 設定済み
- [ ] 各ジョブの手動実行テスト完了
- [ ] 正しいチャンネルに送信されることを確認

### 本番環境

- [ ] `bun run push:prod` 成功
- [ ] Script Properties に `SLACK_WEBHOOK_URLS` 設定済み
- [ ] トリガー設定確認済み
- [ ] 各ジョブの手動実行テスト完了
- [ ] 1日程度の稼働監視完了

### 移行完了後

- [ ] `SLACK_WEBHOOK_URL`（旧形式）削除
- [ ] `.env.sample` 更新
- [ ] ドキュメント更新

---

## 参考: コマンド一覧

| コマンド | 説明 |
|---------|------|
| `bun run build` | ビルド |
| `bun test` | テスト実行 |
| `bunx biome check .` | Lint |
| `bun run push` | 開発環境へpush |
| `bun run push:prod` | 本番環境へpush |
| `bun run open` | 開発GASエディタを開く |
| `bun run open:prod` | 本番GASエディタを開く |
| `bun run deploy` | 開発環境へデプロイ |
| `bun run deploy:prod` | 本番環境へデプロイ |
