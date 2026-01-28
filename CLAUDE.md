# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## プロジェクト概要

**confluence-gas-toolkit** は、Confluence Server/Data Center のページ更新を監視し、Slack に通知を送信するための TypeScript ツールキットです。Google Apps Script (GAS) 上で動作し、ローカル開発もサポートしています。

## ビルド・開発コマンド

```bash
# 依存関係のインストール
bun install

# ローカル開発・テスト
bun run ./debug-local.ts

# GAS 用ビルド
bun run build

# GAS へプッシュ
bun run push           # 開発環境
bun run push:prod      # 本番環境

# GAS プロジェクトをブラウザで開く
bun run open
bun run open:prod

# Lint・フォーマット (Biome)
bunx biome check .
bunx biome format .

# テスト実行
bun test
```

## アーキテクチャ

**レイヤー構造:**

```
src/index.ts              → GAS エントリーポイント、呼び出し可能な関数をエクスポート
src/use-case/             → ジョブオーケストレーション (confluence-update-notify-job, confluence-update-summary-job)
src/services/             → ビジネスロジック
  ├─ confluence/          → Confluence API 連携 & ページネーション
  ├─ slack/               → メッセージ送信
  ├─ confluence-slack/    → ペイロードフォーマット (Confluence→Slack)
  ├─ scheduler/           → 時間ベースの実行ルール
  └─ io/                  → ジョブ状態の永続化 (JSON ファイル)
src/clients/              → API クライアント (シングルトンパターン)
  ├─ http-client.ts       → デュアル環境対応の基底クラス (fetch/UrlFetchApp)
  ├─ confluence-client.ts → Confluence REST API
  └─ slack-client.ts      → Slack Webhook
src/types/                → TypeScript 型定義
src/utils/                → ユーティリティ (env, datetime, file, url, collection)
```

**パスエイリアス** (tsconfig.json & vite.config.ts で設定):
- `~/clients`, `~/services`, `~/types`, `~/use-case`, `~/utils`

## 実装の重要ポイント

- **デュアル環境対応**: コードは GAS とローカル Node.js/Bun の両方で動作
  - `HttpClient` は GAS では `UrlFetchApp.fetch()` を、ローカルでは `fetch()` を使用
  - `getEnvVariable()` は `process.env.TARGET` をチェックし、GAS PropertiesService または process.env を使い分け
- **状態の永続化**: ジョブデータは `data/*.json` ファイル (または GAS PropertiesService) に保存
- **日付処理**: `deepTransform()` が API レスポンス内の ISO 8601 文字列を Date オブジェクトに変換
- **スケジュール実行**: ジョブは `job-schedule-config.ts` で設定された時間帯・曜日のみ実行

## コードスタイル

- Biome による Lint・フォーマット (行幅100文字、インデント2スペース)
- TypeScript strict モード有効
- コードベース内のコメントは日本語
