---
paths:
  - "src/**/*.ts"
  - "bin/**/*.ts"
---

# コーディング規約（AI Agent向け）

## フォーマット

- Biome使用（`bunx biome check --write .`）
- インデント: スペース2文字
- 行幅: 100文字
- import: アルファベット順（Biomeが自動整理）

## TypeScript

- strictモード有効
- 型定義は`src/types/`に集約
- `any`は避ける。必要な場合は`biome-ignore`に理由を明記：
  ```typescript
  // biome-ignore lint/suspicious/noExplicitAny: JSONパース結果の型が不定のため
  ```

## コメント

- コードベース内のコメントは**日本語**で記述
- 自明なコードにはコメント不要
- 複雑なロジックには「なぜ」を説明

## コミットメッセージ

Conventional Commits形式：
```
<type>: <subject（日本語）>
```

type: `feat` / `fix` / `refactor` / `docs` / `style` / `test` / `chore` / `perf`

## ファイル配置ルール

- テストファイル: 対象と同じディレクトリに`*.test.ts`
- 新規ファイル: 適切なディレクトリに配置し、必要に応じて`index.ts`でre-export
- パスエイリアス（`~/clients`など）を使用

## 避けるべきこと

- 過度な抽象化（1回しか使わないヘルパー関数など）
- 不要なエラーハンドリング（内部コードは信頼）
- 後方互換性ハック（未使用コードは削除）
