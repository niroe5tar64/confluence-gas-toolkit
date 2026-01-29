# デプロイガイド

このドキュメントでは、confluence-gas-toolkit を Google Apps Script (GAS) 環境にデプロイする手順を説明します。

## 前提条件

- Bun がインストールされていること
- Google アカウントを持っていること
- clasp でログイン済みであること

### clasp のログイン

```bash
bunx clasp login
```

ブラウザが開くので、Google アカウントでログインして権限を許可します。

## 初回セットアップ

### 1. GAS プロジェクトの作成

Apps Script エディタで新しいプロジェクトを作成するか、既存のプロジェクトを使用します。

### 2. clasp 設定ファイルの作成

```bash
# 開発環境用
cp .clasp.json.sample .clasp-dev.json

# 本番環境用（必要に応じて）
cp .clasp.json.sample .clasp-prod.json
```

### 3. Script ID の設定

各 `.clasp-*.json` ファイルに Script ID を設定します。

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./dist"
}
```

Script ID の確認方法は [CONFIGURATION.md](./CONFIGURATION.md) を参照してください。

## デプロイ手順

### 開発環境へのデプロイ

```bash
# ビルド + プッシュ
bun run push
```

このコマンドは以下を実行します：
1. TypeScript を GAS 用の JavaScript にビルド
2. `.clasp-dev.json` の設定を使用して GAS にプッシュ

### 本番環境へのデプロイ

```bash
# ビルド + プッシュ（本番）
bun run push:prod
```

このコマンドは `.clasp-prod.json` の設定を使用します。

### ビルドのみ実行

```bash
bun run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

## GAS でのトリガー設定

デプロイ後、GAS 上でトリガーを設定して定期実行を有効にします。

### トリガーの設定手順

1. Apps Script エディタを開く

    ```bash
    bun run open        # 開発環境
    bun run open:prod   # 本番環境
    ```

2. 左サイドバーの時計アイコン（トリガー）をクリック

3. 「トリガーを追加」をクリック

4. 以下を設定：

    | 項目 | 設定値 |
    |------|--------|
    | 実行する関数 | `confluenceUpdateNotifyJob`、`confluenceUpdateSummaryJob`、`confluenceCreateNotifyJob` など |
    | 実行するデプロイ | 「Head」 |
    | イベントのソース | 「時間主導型」 |
    | 時間ベースのトリガーのタイプ | 「分ベースのタイマー」 |
    | 時間の間隔 | 「5分おき」など |

5. 「保存」をクリック

### 利用可能な関数

| 関数名 | 説明 |
|--------|------|
| `confluenceUpdateNotifyJob` | ページ更新を個別に Slack 通知 |
| `confluenceUpdateSummaryJob` | ページ更新をサマリー形式で Slack 通知 |
| `confluenceCreateNotifyJob` | 新規作成ページを Slack 通知 |

### トリガー設定のベストプラクティス

- **実行間隔**: 5〜15分程度を推奨
- **エラー通知**: トリガー設定でエラー通知を有効にする
- **実行時間帯**: ジョブ内部のスケジュール設定と合わせる

## Script Properties の設定

GAS 環境では環境変数の代わりに Script Properties を使用します。

### 設定手順

1. Apps Script エディタで歯車アイコン（プロジェクトの設定）をクリック
2. 「スクリプト プロパティ」セクションまでスクロール
3. 「スクリプト プロパティを追加」をクリック
4. 以下の変数を設定：

| プロパティ名 | 値 |
|-------------|-----|
| `CONFLUENCE_PAT` | Confluence Personal Access Token |
| `CONFLUENCE_URL` | Confluence のベース URL |
| `SPACE_KEY` | 監視対象のスペースキー |
| `ROOT_PAGE_ID` | 監視対象の親ページ ID |
| `SLACK_WEBHOOK_URLS` | ジョブごとの Webhook URL（JSON形式） |
| `SLACK_WEBHOOK_URL` | 旧形式の Webhook URL（後方互換用、オプション） |
| `SLACK_HEADER_TEXT` | 通知ヘッダーテキスト |

> **注記**: `SLACK_WEBHOOK_URLS` は JSON 形式で以下のように設定します：
> ```json
> {"update-notify":"https://hooks.slack.com/...","update-summary":"https://hooks.slack.com/...","create-notify":"https://hooks.slack.com/..."}
> ```

## デプロイの確認

### 動作確認

1. Apps Script エディタを開く
2. 実行する関数を選択（例: `confluenceUpdateNotifyJob`）
3. 「実行」ボタンをクリック
4. 「実行ログ」で結果を確認

### トラブルシューティング

問題が発生した場合は [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。

## 更新デプロイ

コードを更新した場合は、同じコマンドで再デプロイできます。

```bash
# 開発環境
bun run push

# 本番環境
bun run push:prod
```

> **注意**: GAS 側のトリガー設定は維持されます。関数名を変更した場合はトリガーの再設定が必要です。

## ロールバック

GAS にはバージョン管理機能があります。

1. Apps Script エディタで「デプロイ」→「デプロイを管理」
2. 以前のバージョンを選択して有効化

ただし、`bun run push` でプッシュした場合は HEAD（最新）が直接更新されるため、Git でコードを戻して再プッシュする方が確実です。

```bash
git checkout <previous-commit> -- src/
bun run push
```
