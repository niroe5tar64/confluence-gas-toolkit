# アーキテクチャガイド

このドキュメントでは、confluence-gas-toolkit の設計思想とアーキテクチャについて説明します。

## 概要

confluence-gas-toolkit は、Confluence Server/Data Center のページ更新を監視し、Slack に通知を送信するツールキットです。Google Apps Script (GAS) 上で動作しますが、ローカル環境でも開発・テストが可能なデュアル環境対応の設計になっています。

## レイヤー構造

```
┌─────────────────────────────────────────────────────────┐
│                    src/index.ts                         │
│                 (GAS エントリーポイント)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/use-case/                        │
│                 (ジョブオーケストレーション)               │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │ confluence-update-  │  │ confluence-update-  │       │
│  │ notify-job.ts       │  │ summary-job.ts      │       │
│  └─────────────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/services/                        │
│                   (ビジネスロジック)                      │
│  ┌───────────┐ ┌───────────┐ ┌───────────────────┐      │
│  │confluence/│ │  slack/   │ │confluence-slack/  │      │
│  └───────────┘ └───────────┘ └───────────────────┘      │
│  ┌───────────┐ ┌───────────┐                            │
│  │scheduler/ │ │    io/    │                            │
│  └───────────┘ └───────────┘                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    src/clients/                         │
│                   (API クライアント)                      │
│  ┌───────────────┐ ┌─────────────────┐ ┌─────────────┐  │
│  │ http-client   │ │confluence-client│ │slack-client │  │
│  └───────────────┘ └─────────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              src/types/ & src/utils/                    │
│              (型定義 & ユーティリティ)                    │
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

### サービス (`src/services/`)

- ビジネスロジックの実装
- 単一責任の原則に従った分割

| ディレクトリ | 責務 |
|-------------|------|
| `confluence/` | Confluence API との連携、ページネーション処理 |
| `slack/` | Slack メッセージの送信 |
| `confluence-slack/` | Confluence データから Slack ペイロードへの変換 |
| `scheduler/` | 実行スケジュールの判定 |
| `io/` | ジョブ状態（タイムスタンプ等）の永続化 |

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

```typescript
// utils/env.ts
const isGAS = typeof process === "undefined" || process.env.TARGET === "gas";
```

### HTTP クライアントの切り替え

```typescript
// clients/http-client.ts
if (isGAS) {
  // GAS: UrlFetchApp.fetch() を使用
  UrlFetchApp.fetch(url, options);
} else {
  // ローカル: fetch API を使用
  fetch(url, options);
}
```

### 環境変数の取得

```typescript
// utils/env.ts
if (isGAS) {
  // GAS: PropertiesService を使用
  PropertiesService.getScriptProperties().getProperty(key);
} else {
  // ローカル: process.env を使用
  process.env[key];
}
```

### 状態の永続化

| 環境 | 保存先 |
|------|--------|
| GAS | PropertiesService |
| ローカル | `data/*.json` ファイル |

## データフロー

### 更新通知ジョブの流れ

```
1. ジョブ開始
   │
2. スケジュールチェック
   │ → 実行時間外なら終了
   │
3. 前回実行時のタイムスタンプを読み込み
   │
4. Confluence API で更新ページを取得
   │ → ページネーションで全件取得
   │
5. 各ページを Slack メッセージに変換
   │
6. Slack に送信
   │
7. 最新のタイムスタンプを保存
   │
8. ジョブ終了
```

## 拡張ポイント

### 新しい通知先の追加

1. `src/clients/` に新しいクライアントを追加
2. `src/services/<service-name>/` にサービスを追加
3. `src/use-case/` で新しいジョブを作成

### 新しいスケジュールルールの追加

`src/services/scheduler/job-schedule-config.ts` を編集します。

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
