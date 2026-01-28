# コントリビューションガイド

このプロジェクトへの貢献に興味を持っていただきありがとうございます。このドキュメントでは、開発に参加するためのガイドラインを説明します。

## 開発環境のセットアップ

### 必要なツール

- [Bun](https://bun.sh/) (v1.0以上)
- [Git](https://git-scm.com/)
- エディタ（VS Code 推奨）

### セットアップ手順

1. リポジトリをクローン

    ```bash
    git clone <repository-url>
    cd confluence-gas-toolkit
    ```

2. 依存関係をインストール

    ```bash
    bun install
    ```

3. 環境変数を設定

    ```bash
    cp .env.sample .env
    # .env を編集して必要な値を設定
    ```

4. 動作確認

    ```bash
    bun test
    bun run ./debug-local.ts
    ```

## コーディング規約

### フォーマット・Lint

[Biome](https://biomejs.dev/) を使用しています。

| 項目 | 設定 |
|------|------|
| インデント | スペース2文字 |
| 行幅 | 100文字 |
| import整理 | アルファベット順（自動） |

```bash
# チェック
bunx biome check .

# 自動修正
bunx biome check --write .
```

### TypeScript

- strict モード有効
- 型定義は `src/types/` に集約
- `any` の使用は避け、必要な場合は `biome-ignore` に理由を明記

### コメント

- コードベース内のコメントは日本語で記述
- 自明なコードにはコメント不要
- 複雑なロジックには「なぜ」を説明するコメントを追加

## ブランチ戦略

```
main          ← 本番リリース可能な状態を維持
  └── feature/xxx   ← 機能開発・バグ修正
```

### ブランチ命名規則

| 種類 | 形式 | 例 |
|------|------|-----|
| 機能追加 | `feature/<説明>` | `feature/add-pagination` |
| バグ修正 | `fix/<説明>` | `fix/slack-notification-error` |
| リファクタ | `refactor/<説明>` | `refactor/simplify-http-client` |
| ドキュメント | `docs/<説明>` | `docs/update-readme` |

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従います。

### 形式

```
<type>: <subject>

<body（任意）>
```

### type 一覧

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | 機能変更なしのコード改善 |
| `docs` | ドキュメントのみの変更 |
| `style` | フォーマットのみ（ロジック変更なし） |
| `test` | テストの追加・修正 |
| `chore` | ビルド設定、依存関係更新など |
| `perf` | パフォーマンス改善 |

### 例

```bash
# 良い例
feat: Slack通知にページ作成者を追加
fix: ページネーション時の重複取得を修正
refactor: HttpClientのエラーハンドリングを簡潔化

# 悪い例
update code        # type がない、内容が曖昧
feat: 修正         # subject が曖昧
```

## プルリクエスト

### 作成前の確認

1. テストが通ること

    ```bash
    bun test
    ```

2. Lint エラーがないこと

    ```bash
    bunx biome check .
    ```

3. ローカルで動作確認

    ```bash
    bun run ./debug-local.ts
    ```

### PR の書き方

```markdown
## 概要
<!-- 何を、なぜ変更したか -->

## 変更内容
<!-- 主な変更点を箇条書きで -->

## テスト方法
<!-- 動作確認の手順 -->
```

### レビュー後の対応

- 指摘事項は新しいコミットで対応（fixup は避ける）
- 大きな変更が必要な場合は相談

## テスト

### テストの実行

```bash
# 全テスト実行
bun test

# 特定のファイルのみ
bun test src/utils/url.test.ts

# watch モード
bun test --watch
```

### テストの書き方

- テストファイルは対象ファイルと同じディレクトリに `*.test.ts` として配置
- `describe` でグループ化、`test` で個別のケースを記述

```typescript
import { describe, expect, test } from "bun:test";
import { targetFunction } from "./target";

describe("targetFunction", () => {
  test("正常系: 期待される結果を返す", () => {
    expect(targetFunction("input")).toBe("expected");
  });

  test("異常系: 不正な入力でエラー", () => {
    expect(() => targetFunction(null)).toThrow();
  });
});
```

## ディレクトリ構成

変更を加える際は、以下の構成を維持してください。

```
src/
├── index.ts              # GAS エントリーポイント（export のみ）
├── clients/              # API クライアント（外部通信）
├── services/             # ビジネスロジック
├── types/                # 型定義
├── use-case/             # ジョブのオーケストレーション
└── utils/                # 汎用ユーティリティ
```

### 新しいファイルを追加する場合

- 適切なディレクトリに配置
- 必要に応じて `index.ts` から re-export
- パスエイリアス（`~/clients` など）を使用

## 質問・相談

不明な点があれば、Issue を作成するか、PR のコメントでお気軽にご相談ください。
