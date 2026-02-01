# prepare-env.ts 仕様書

## 概要

環境に応じた `.env` ファイルを生成するスクリプト。
`prepare-clasp-json.ts` と同様のパターンで、開発環境と本番環境の `.env` ファイルを切り替える。

## 背景・目的

### 現状

- `.clasp.json` は `prepare-clasp-json.ts` により環境ごとに切り替え可能
- `.env` ファイルは手動管理または単一ファイルのみ

### 課題

- 開発環境と本番環境で異なる環境変数（API URL、認証情報など）を使い分けたい
- 手動での `.env` 切り替えはミスが発生しやすい
- CI/CDでの自動化が困難

### 解決策

`--prod` フラグに応じて `.env.dev` または `.env.prod` を `.env` にコピーする仕組みを導入する。

## ファイル構成

```
project-root/
├── .env              # 実際に使用される環境変数（生成ファイル、gitignore対象）
├── .env.dev          # 開発環境用テンプレート
├── .env.prod         # 本番環境用テンプレート
├── .env.example      # サンプル（既存の場合は維持）
└── bin/
    ├── prepare-clasp-json.ts  # 既存
    └── prepare-env.ts         # 新規作成
```

## 実装仕様

### ファイル: `bin/prepare-env.ts`

```typescript
import fs from "node:fs";

/**
 * 環境に応じた .env ファイルを準備する
 * --prod フラグがある場合は .env.prod を、それ以外は .env.dev を .env にコピーする
 */
const prepareEnv = async (): Promise<void> => {
  const prod = process.argv.some((arg) => arg === "--prod");
  const envFile = prod ? ".env.prod" : ".env.dev";

  if (!fs.existsSync(`./${envFile}`)) {
    console.warn(`Warning: ${envFile} not found, skipping .env preparation`);
    return;
  }

  fs.copyFileSync(`./${envFile}`, "./.env");
  console.log(`Prepared .env from ${envFile}`);
};

export { prepareEnv };
```

### インターフェース

| 関数 | 引数 | 戻り値 | 説明 |
|------|------|--------|------|
| `prepareEnv` | なし | `Promise<void>` | 環境変数ファイルを準備 |

### コマンドライン引数

| 引数 | 説明 |
|------|------|
| `--prod` | 本番環境用の `.env.prod` を使用 |
| (なし) | 開発環境用の `.env.dev` を使用 |

### 処理フロー

```
┌─────────────────────────┐
│   prepareEnv() 呼び出し  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ process.argv に --prod   │
│ が含まれるか判定         │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌─────────┐
│ --prod  │   │ なし    │
│ あり    │   │         │
└────┬────┘   └────┬────┘
     │              │
     ▼              ▼
┌─────────┐   ┌─────────┐
│.env.prod│   │.env.dev │
└────┬────┘   └────┬────┘
     │              │
     └───────┬──────┘
             │
             ▼
┌─────────────────────────┐
│ ファイル存在チェック      │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌─────────┐
│ 存在    │   │ 不在    │
└────┬────┘   └────┬────┘
     │              │
     ▼              ▼
┌─────────┐   ┌─────────┐
│.envに   │   │警告出力 │
│コピー   │   │スキップ │
└─────────┘   └─────────┘
```

## 既存スクリプトとの統合

### 変更対象ファイル

以下のファイルに `prepareEnv()` の呼び出しを追加する:

#### bin/push.ts

```typescript
import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareEnv } from "./prepare-env";  // 追加

await prepareClaspJson();
await prepareEnv();  // 追加
await $`bun run build`;
await $`bunx clasp push`;
```

#### bin/deploy.ts

```typescript
import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareEnv } from "./prepare-env";  // 追加

await prepareClaspJson();
await prepareEnv();  // 追加
await $`bun run build`;
await $`bunx clasp deploy`;
```

#### bin/open.ts

```typescript
import { $ } from "bun";
import { prepareClaspJson } from "./prepare-clasp-json";
import { prepareEnv } from "./prepare-env";  // 追加

await prepareClaspJson();
await prepareEnv();  // 追加
await $`bun run build`;
await $`bunx clasp open`;
```

## .gitignore の更新

以下を `.gitignore` に追加（未追加の場合）:

```gitignore
# 環境変数（生成ファイル）
.env

# 本番環境の秘匿情報
.env.prod
```

**注意**: `.env.dev` は秘匿情報を含まない場合はコミット可。含む場合は `.gitignore` に追加する。

## テスト仕様

### ファイル: `bin/__test__/prepare-env.test.ts`

```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";

describe("prepareEnv", () => {
  const testDir = path.resolve(__dirname, "./tmp-env-test");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test("--prod なしの場合、.env.dev を .env にコピーする", async () => {
    fs.writeFileSync(".env.dev", "ENV=development");
    // prepareEnv を実行（process.argv を操作してテスト）
    // .env の内容が "ENV=development" であることを確認
  });

  test("--prod ありの場合、.env.prod を .env にコピーする", async () => {
    fs.writeFileSync(".env.prod", "ENV=production");
    // prepareEnv を実行（process.argv に --prod を追加）
    // .env の内容が "ENV=production" であることを確認
  });

  test("ソースファイルが存在しない場合、警告を出してスキップする", async () => {
    // .env.dev も .env.prod も存在しない状態で prepareEnv を実行
    // エラーにならず、警告がログ出力されることを確認
  });
});
```

## 使用例

### 開発環境へプッシュ

```bash
bun run push        # .env.dev → .env
```

### 本番環境へプッシュ

```bash
bun run push:prod   # .env.prod → .env
```

### 単体で実行

```bash
bun bin/prepare-env.ts          # 開発環境
bun bin/prepare-env.ts --prod   # 本番環境
```

## 将来の拡張案

1. **環境変数のバリデーション**: 必須キーが存在するかチェック
2. **マージ機能**: `.env.base` + `.env.{dev|prod}` のマージ
3. **暗号化対応**: `.env.prod.encrypted` からの復号
