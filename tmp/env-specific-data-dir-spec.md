# 環境別データディレクトリ実装計画

## 概要

状態永続化に使用するディレクトリを本番/開発環境で分離する。

## ディレクトリ構成

| 環境 | ビルドコマンド | ディレクトリ |
|------|--------------|-------------|
| GAS本番 | `push:prod` / `deploy:prod` | `confluence-gas-toolkit/prod/` |
| GAS開発 | `push` / `deploy` | `confluence-gas-toolkit/dev/` |
| ローカル本番 | `APP_ENV=prod bun run ...` | `confluence-gas-toolkit/prod/` |
| ローカル開発 | `bun run ...` | `confluence-gas-toolkit/dev/` |

## 実装タスク

### 1. ビルド時に `APP_ENV` を埋め込む

**ファイル**: `bin/build/convert-to-gas.ts`

**変更内容**:
- `--prod` フラグを検出して `process.env.APP_ENV` を定義に追加

```typescript
// 43行目付近の build 関数内
const build = async (filename: string, name: string) => {
  loadDotEnv(resolveEnvPath());
  const appEnv = process.argv.includes("--prod") ? "prod" : "dev";  // 追加
  const res = await buildUsingVite({
    // ...
    define: {
      "process.env.TARGET": JSON.stringify("GAS"),
      "process.env.APP_ENV": JSON.stringify(appEnv),  // 追加
    },
  });
  // ...
};
```

### 2. 環境判定関数を追加

**ファイル**: `src/utils/env.ts`

**追加内容**:
```typescript
/** アプリケーション環境の型 */
export type AppEnv = "dev" | "prod";

/**
 * 現在のアプリケーション環境を取得する。
 *
 * - GAS環境: ビルド時に埋め込まれた `process.env.APP_ENV` を返す
 * - ローカル環境: `process.env.APP_ENV` を返す（未設定時は "dev"）
 *
 * @returns {AppEnv} "prod" または "dev"
 */
export function getAppEnv(): AppEnv {
  return process.env.APP_ENV === "prod" ? "prod" : "dev";
}
```

### 3. IO設定ファイルを新規作成

**ファイル**: `src/config/io-config.ts`（新規作成）

```typescript
import { getAppEnv } from "~/utils/env";

/**
 * IO関連の設定
 */
export const IO_CONFIG = {
  /**
   * ジョブデータを保存するディレクトリパス
   *
   * - 本番環境: `confluence-gas-toolkit/prod`
   * - 開発環境: `confluence-gas-toolkit/dev`
   */
  get dataDir(): string {
    return `confluence-gas-toolkit/${getAppEnv()}`;
  },
} as const;
```

### 4. config/index.ts で re-export

**ファイル**: `src/config/index.ts`

**追加内容**:
```typescript
export { IO_CONFIG } from "./io-config";
```

### 5. job-data.ts でIO_CONFIGを使用

**ファイル**: `src/services/io/job-data.ts`

**変更前**:
```typescript
import { JobData, JobDataFileName, isJobData } from "~/types";
import { readFile, writeFile } from "~/utils";

const POLLING_INFO_DIR = "data"; // ポーリング情報を保存するファイル名
```

**変更後**:
```typescript
import { IO_CONFIG } from "~/config";
import { isJobData, type JobData, type JobDataFileName } from "~/types";
import { readFile, writeFile } from "~/utils";

// IO_CONFIG.dataDir を使用（環境に応じて自動的に切り替わる）
```

**関数内の変更**:
- `updateJobData`: `${POLLING_INFO_DIR}/${fileName}` → `${IO_CONFIG.dataDir}/${fileName}`
- `parseJobData`: `${POLLING_INFO_DIR}/${fileName}` → `${IO_CONFIG.dataDir}/${fileName}`

### 6. .gitignore に追加

**ファイル**: `.gitignore`

**追加内容**（176行目の `data` の後に追加）:
```
confluence-gas-toolkit/
```

## テスト方法

### ローカル環境

```bash
# 開発環境として実行（デフォルト）
bun run src/use-case/confluence-update-notify-job.ts
# → confluence-gas-toolkit/dev/ にファイルが作成される

# 本番環境として実行
APP_ENV=prod bun run src/use-case/confluence-update-notify-job.ts
# → confluence-gas-toolkit/prod/ にファイルが作成される
```

### GAS環境

```bash
# 開発環境へプッシュ
bun run push
# → GAS実行時に Google Drive の confluence-gas-toolkit/dev/ を使用

# 本番環境へプッシュ
bun run push:prod
# → GAS実行時に Google Drive の confluence-gas-toolkit/prod/ を使用
```

## 影響範囲

- `src/services/io/job-data.ts` - ディレクトリパスの参照元変更
- `src/use-case/confluence-update-notify-job.ts` - 間接的に影響（動作確認必要）
- `src/use-case/confluence-update-summary-job.ts` - 間接的に影響（動作確認必要）
- `src/use-case/confluence-create-notify-job.ts` - 間接的に影響（動作確認必要）

## 注意事項

1. **既存データの移行**: 既存の `data/*.json` ファイルがある場合、新しいディレクトリ構造に手動で移行が必要
2. **Google Drive**: GAS環境では初回実行時にフォルダが自動作成される
3. **ローカル環境**: `writeFile` 関数が `mkdirSync({ recursive: true })` でディレクトリを自動作成する

## ファイル一覧

| ファイル | 操作 |
|----------|------|
| `bin/build/convert-to-gas.ts` | 編集 |
| `src/utils/env.ts` | 編集 |
| `src/config/io-config.ts` | 新規作成 |
| `src/config/index.ts` | 編集 |
| `src/services/io/job-data.ts` | 編集 |
| `.gitignore` | 編集 |
