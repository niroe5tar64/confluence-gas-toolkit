# confluence-gas-toolkit

`confluence-gas-toolkit` は、Google Apps Script（GAS）から Confluence Server / Data Center (オンプレ版) を操作するためのツールキットです。

## 🛠 主な機能

- 更新ページのSlack通知

## 💻 セットアップ方法（Getting Started）

### ローカル実行環境の構築

1. .envファイルの作成

    ```bash
    cp .env.sample .env
    ```

1. .envファイル内の各変数に値を設定（ローカル環境から実行する際に使用）

    | 変数名 | 説明 |
    |--------|------|
    | `MINIFY` | ビルド時のminify設定 (`true`/`false`) |
    | `CONFLUENCE_PAT` | Confluence Personal Access Token |
    | `CONFLUENCE_URL` | ConfluenceのベースURL |
    | `SPACE_KEY` | 監視対象のスペースキー |
    | `ROOT_PAGE_ID` | 監視対象の親ページのID |
    | `SLACK_HEADER_TEXT` | Slack通知のヘッダーテキスト |
    | `SLACK_WEBHOOK_URL` | Slack WebhookのURL |

1. Bun のインストール ([URL](https://bun.sh/docs/installation))

1. パッケージのインストール

    ```bash
    bun install
    ```

1. ローカル実行コマンドの実行

    ```bash
    bun run ./debug-local.ts
    ```

### GAS環境へのアップロード

1. 設定ファイルの作成

    ```bash
    # 開発環境用
    cp .clasp.json.sample .clasp-dev.json
    # 本番環境用（必要に応じて）
    cp .clasp.json.sample .clasp-prod.json
    ```

1. 各 `.clasp-*.json` 内の `scriptId` に反映対象の Script ID を設定

    <details>
      <summary>Script ID の調べ方</summary>

      1. 反映予定のAppScriptを開く
      1. サイドバーの歯車アイコン（プロジェクトの設定）を選択
      1. 下図の位置に Script ID が表示されている

          ![where_is_script_id](./docs/images/where_is_script_id.png)
    </details><br>

1. GAS環境に反映

    ```bash
    bun run push        # .clasp-dev.json を使用して GAS にプッシュ
    bun run push:prod   # .clasp-prod.json を使用して GAS にプッシュ
    ```

    ### Tips

    #### コマンドからAppScriptを開く
    ```bash
    bun run open        # .clasp-dev.json のプロジェクトをブラウザで開く
    bun run open:prod   # .clasp-prod.json のプロジェクトをブラウザで開く
    ```
    #### アプリのデプロイ（利用しない予定）
    ```bash
    bun run deploy      # .clasp-dev.json を使用してデプロイ
    bun run deploy:prod # .clasp-prod.json を使用してデプロイ
    ```

1. Script Property の設定 (GAS環境側の環境変数)

    `.env` に設定した環境変数

    <details>
      <summary>Script Property の設定方法</summary>

      1. AppScriptを開く
      1. サイドバーの歯車アイコン（プロジェクトの設定）を選択
      1. 下図の手順でスクリプト プロパティを追加

          ![how_to_script_property](./docs/images/how_to_script_property.png)
    </details>

## 🧪 開発

### テスト実行

```bash
bun test
```

### Lint・フォーマット

[Biome](https://biomejs.dev/) を使用しています。

```bash
# Lintチェック
bunx biome check .

# フォーマット
bunx biome format .

# Lint + フォーマット（自動修正）
bunx biome check --write .
```

## 📁 ディレクトリ構成

```
src/
├── index.ts              # GAS エントリーポイント
├── clients/              # API クライアント
│   ├── http-client.ts    # デュアル環境対応 HTTP クライアント
│   ├── confluence-client.ts
│   └── slack-client.ts
├── services/             # ビジネスロジック
│   ├── confluence/       # Confluence API 連携
│   ├── slack/            # Slack メッセージ送信
│   ├── confluence-slack/ # Confluence → Slack ペイロード変換
│   ├── scheduler/        # 実行スケジュール管理
│   └── io/               # ジョブ状態の永続化
├── types/                # TypeScript 型定義
├── use-case/             # ジョブオーケストレーション
└── utils/                # ユーティリティ
```
