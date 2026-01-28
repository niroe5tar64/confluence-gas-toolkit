# 設定ガイド

このドキュメントでは、confluence-gas-toolkit の設定項目について詳しく説明します。

## 環境変数

### ローカル環境

ローカル環境では `.env` ファイルで環境変数を設定します。

```bash
cp .env.sample .env
```

### GAS 環境

GAS 環境では Script Properties で環境変数を設定します。

1. Apps Script エディタを開く
2. 歯車アイコン（プロジェクトの設定）をクリック
3. 「スクリプト プロパティ」セクションで各変数を追加

## 環境変数一覧

### ビルド設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|-----------|------|
| `MINIFY` | - | `false` | ビルド時の minify 設定。本番環境では `true` 推奨 |

### Confluence 設定

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `CONFLUENCE_PAT` | Yes | Confluence Personal Access Token |
| `CONFLUENCE_URL` | Yes | Confluence のベース URL（例: `https://confluence.example.com`） |
| `SPACE_KEY` | Yes | 監視対象のスペースキー |
| `ROOT_PAGE_ID` | Yes | 監視対象の親ページ ID |

#### CONFLUENCE_PAT の取得方法

1. Confluence にログイン
2. 右上のプロフィールアイコン → 「設定」
3. 「Personal Access Tokens」を選択
4. 「Create token」で新しいトークンを作成
5. トークンをコピーして環境変数に設定

> **注意**: トークンは作成時にのみ表示されます。必ず安全な場所に保存してください。

#### SPACE_KEY の確認方法

- スペースの URL から確認: `https://confluence.example.com/display/SPACEKEY/...`
- スペースの設定画面から確認

#### ROOT_PAGE_ID の確認方法

- ページ URL から確認: `https://confluence.example.com/pages/viewpage.action?pageId=12345`
- ページの「ページ情報」から確認

### Slack 設定

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `SLACK_WEBHOOK_URL` | Yes | Slack Incoming Webhook の URL |
| `SLACK_HEADER_TEXT` | Yes | 通知メッセージのヘッダーテキスト |

#### Slack Webhook の設定方法

1. [Slack App Directory](https://slack.com/apps) にアクセス
2. 「Incoming Webhooks」を検索してインストール
3. 通知先のチャンネルを選択
4. 生成された Webhook URL をコピー

## スケジュール設定

ジョブの実行スケジュールは `src/services/scheduler/job-schedule-config.ts` で設定します。

### 設定例

```typescript
export const jobExecutionPolicy: Record<string, JobExecutionRule> = {
  confluenceUpdateNotifyJob: {
    name: "Confluence更新通知JOBの設定",
    description: "平日 8:00 ~ 19:00",
    executableConditions: [
      {
        allowedDays: [1, 2, 3, 4, 5],  // 月〜金
        startHour: 8,
        endHour: 19,
      },
    ],
  },
};
```

### パラメータ

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `allowedDays` | `number[]` | 実行可能な曜日（0: 日, 1: 月, ..., 6: 土） |
| `startHour` | `number` | 実行開始時刻（24時間制） |
| `endHour` | `number` | 実行終了時刻（24時間制） |

### 複数条件の設定

複数の時間帯を設定する場合は、`executableConditions` 配列に複数の条件を追加します。

```typescript
executableConditions: [
  // 平日 9:00 - 12:00
  { allowedDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 12 },
  // 平日 13:00 - 18:00
  { allowedDays: [1, 2, 3, 4, 5], startHour: 13, endHour: 18 },
]
```

## clasp 設定

GAS へのデプロイには clasp を使用します。

### 設定ファイル

| ファイル | 用途 |
|---------|------|
| `.clasp-dev.json` | 開発環境用の設定 |
| `.clasp-prod.json` | 本番環境用の設定 |

### 設定内容

```json
{
  "scriptId": "<YOUR_SCRIPT_ID>",
  "rootDir": "./dist"
}
```

### Script ID の確認方法

1. Apps Script エディタを開く
2. 歯車アイコン（プロジェクトの設定）をクリック
3. 「スクリプト ID」をコピー

## 設定のベストプラクティス

### 本番環境と開発環境の分離

- 別々の GAS プロジェクトを用意
- 別々の Slack チャンネルに通知
- `.clasp-dev.json` と `.clasp-prod.json` で管理

### セキュリティ

- `.env` ファイルを Git にコミットしない（`.gitignore` に含まれています）
- Personal Access Token は定期的にローテーション
- 最小権限の原則に従ってトークンを発行
