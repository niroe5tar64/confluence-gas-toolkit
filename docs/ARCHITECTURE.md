# アーキテクチャガイド

このドキュメントでは、confluence-gas-toolkit の設計思想とアーキテクチャについて説明します。現在は以下の 3 つのジョブを提供します。

- ページ更新の個別通知 (`confluenceUpdateNotifyJob`)
- ページ更新のサマリー通知 (`confluenceUpdateSummaryJob`)
- ページ新規作成の個別通知 (`confluenceCreateNotifyJob`)

## 概要

confluence-gas-toolkit は、Confluence Server/Data Center のページ更新を監視し、Slack に通知を送信するツールキットです。Google Apps Script (GAS) 上で動作しますが、ローカル環境でも開発・テストが可能なデュアル環境対応の設計になっています。

## レイヤー構造

```
┌─────────────────────────────────────────────────────────┐
│                    src/index.ts                         │
│                   (GAS Entry Point)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/use-case/                        │
│                  (Job Orchestration)                    │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │ confluence-update-  │  │ confluence-update-  │       │
│  │ notify-job.ts       │  │ summary-job.ts      │       │
│  └─────────────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/services/                        │
│                  (Business Logic)                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐      │
│  │confluence/│ │  slack/   │ │confluence-slack/  │      │
│  └───────────┘ └───────────┘ └───────────────────┘      │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐      │
│  │scheduler/ │ │    io/    │ │     config/       │      │
│  └───────────┘ └───────────┘ └───────────────────┘      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/clients/                         │
│                   (API Clients)                         │
│  ┌───────────────┐ ┌─────────────────┐ ┌─────────────┐  │
│  │ http-client   │ │confluence-client│ │slack-client │  │
│  └───────────────┘ └─────────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              src/types/ & src/utils/                    │
│                (Types & Utilities)                      │
└─────────────────────────────────────────────────────────┘
```

## 各レイヤーの責務

### エントリーポイント (`src/index.ts`)

- GAS から呼び出される関数をエクスポート
- トリガー設定で指定する関数名を定義
- 実装は use-case に委譲

### ユースケース (`src/use-case/`)

- ジョブ全体のオーケストレーション
- エラーハンドリングと通知
- 各サービスの呼び出し順序を制御

| ファイル | 責務 |
|---------|------|
| `confluence-update-notify-job.ts` | ページ更新を個別に Slack 通知 |
| `confluence-update-summary-job.ts` | ページ更新をサマリー形式で通知 |
| `confluence-create-notify-job.ts` | ページ新規作成を個別に Slack 通知 |

### サービス (`src/services/`)

- ビジネスロジックの実装
- 単一責任の原則に従った分割

| ディレクトリ | 責務 |
|-------------|------|
| `confluence/` | Confluence API との連携、ページネーション処理 |
| `slack/` | Slack メッセージの送信 |
| `confluence-slack/` | Confluence データから Slack ペイロードへの変換 |
| `scheduler/` | 実行可否の判定ロジック |
| `io/` | ジョブ状態（タイムスタンプ等）の永続化 |

### 設定 (`src/config/`)

| ファイル | 責務 |
|---------|------|
| `job-schedule.ts` | ジョブ実行スケジュールの定義 |
| `confluence-page-configs.ts` | 監視対象ページの設定 |
| `slack-routes.ts` | Slack Webhook のルーティング設定 |
| `slack-messages.ts` | ジョブごとのメッセージヘッダー文言 |

### クライアント (`src/clients/`)

- 外部 API との通信を抽象化
- シングルトンパターンで実装

| ファイル | 責務 |
|---------|------|
| `http-client.ts` | デュアル環境対応の HTTP クライアント基底クラス |
| `confluence-client.ts` | Confluence REST API クライアント |
| `slack-client.ts` | Slack Webhook クライアント |

### 型定義 (`src/types/`)

- TypeScript の型定義を集約
- Confluence API / Slack API のレスポンス型
- ジョブ設定の型

### ユーティリティ (`src/utils/`)

- 汎用的なヘルパー関数
- 環境変数の取得
- 日付フォーマット
- ファイル操作

## デュアル環境対応

このツールキットの特徴は、GAS とローカル環境の両方で動作することです。

### 環境の判定

`process.env.TARGET` の値で環境を判定します。ビルド時に esbuild が `"GAS"` または `undefined` を埋め込みます。

```typescript
// ローカル環境かどうかを判定
if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
  // ローカル環境 (Bun/Node.js)
} else {
  // GAS 環境
}
```

### HTTP クライアントの切り替え

```typescript
// clients/http-client.ts
if (process.env.TARGET !== "GAS") {
  // ローカル: fetch API を使用
  return fetch(url, options);
}
// GAS: UrlFetchApp.fetch() を使用
return UrlFetchApp.fetch(url, gasOptions);
```

### 環境変数の取得

```typescript
// utils/env.ts
if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
  // ローカル: process.env を使用
  return process.env[key] || null;
}
// GAS: PropertiesService を使用
return PropertiesService.getScriptProperties().getProperty(key);
```

### 状態の永続化

| 環境 | 保存先 |
|------|--------|
| GAS | Google Drive に `data/*.json` を作成して永続化（Drive 権限が必要） |
| ローカル | リポジトリ直下の `data/*.json` ファイル |

> **Note**: GAS へのデプロイ時は Drive API 権限付与（スクリプトの「Google Drive へのアクセス」）を忘れないでください。

## データフロー

### ページ更新（個別通知）

1. スケジュールチェック（`job-schedule.ts`、対象: confluenceUpdateNotifyJob）
2. 前回タイムスタンプを読み込み（`data/confluence-update-notify-job.json`）
3. Confluence 変更ページを取得（ページネーション対応）
4. ページごとに Slack ペイロードへ変換
5. Slack へ送信（送信先は `slack-routes.ts`、ヘッダー文言は `slack-messages.ts`）
6. 最新タイムスタンプを保存

### ページ新規作成（個別通知）

1. スケジュールチェック（対象: confluenceCreateNotifyJob）
2. 前回タイムスタンプを読み込み（存在しない場合は 15 分前を既定値に）
3. 変更ページから「新規作成」を抽出（`version.number === 1` または `history.createdDate`）
4. 作成日時順にソートして Slack へ送信
5. 最新更新日時を保存（`data/confluence-create-notify-job.json`）

### ページ更新（サマリー通知）

1. 初回実行時は全ページの版数を初期化して保存
2. 以降は前回タイムスタンプ以降の変更ページを取得
3. 変更箇所をまとめてサマリーペイロードを生成
4. Slack へ送信
5. 最新版の情報とタイムスタンプを保存（`data/confluence-summary-job.json`）

## 拡張ポイント

### 新しい通知先の追加

1. `src/clients/` に新しいクライアントを追加
2. `src/services/<service-name>/` にサービスを追加
3. `src/use-case/` で新しいジョブを作成

### 新しいスケジュールルールの追加

`src/config/job-schedule.ts` を編集します。

### 新しい Confluence 操作の追加

1. `src/clients/confluence-client.ts` にメソッドを追加
2. `src/services/confluence/` にビジネスロジックを追加

## 設計判断の根拠

### なぜ GAS を使用するか

- サーバー不要で定期実行が可能
- Google Workspace との親和性
- 無料で利用可能（クォータ内）

### なぜデュアル環境対応か

- ローカルでの開発・デバッグが容易
- 単体テストが書きやすい
- CI/CD パイプラインでテスト可能

### なぜ Vite でビルドするか

- TypeScript のトランスパイル
- パスエイリアスの解決
- バンドルによる GAS へのデプロイ最適化

## 制約事項

### GAS の制限

| 項目 | 制限 |
|------|------|
| 実行時間 | 最大 6 分 |
| URL Fetch | 1 日 20,000 回 |
| Properties | 500KB まで |

### Confluence API の制限

- レート制限あり（サーバー設定による）
- 1 リクエストで取得できる件数に上限あり（ページネーションで対応）

### 設計上の制約

- 非同期処理は `Promise.all` で並列化可能だが、過度な並列化は避ける
- 状態は最小限に保つ（タイムスタンプのみ）
