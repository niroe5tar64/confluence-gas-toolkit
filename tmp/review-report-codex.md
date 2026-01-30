## Summary
- 重要度High: 1件 / Medium: 2件 / Low: 0件

## Findings

### [Severity: High] Slack週次サマリーが Webhook で送信できない（`rich_text` ブロック使用）
- 対象: src/services/confluence-slack/summary-payload.ts (createSlackSummaryPayload 付近)
- 何が問題か: 生成しているペイロードが Block Kit の `rich_text` / `rich_text_list` ブロックを含むが、Incoming Webhook では `rich_text` ブロックはサポートされておらず、Slack API が `invalid_arguments` で 4xx を返す可能性が高い。結果として週次サマリー通知が失敗する。
- どういう時に起きるか（再現条件）: `confluenceUpdateSummaryJob` が Slack Webhook へサマリー送信を実行した場合（GAS/ローカル問わず）。
- 影響: 週次サマリー通知が一切配信されない（ジョブは例外を検知しないまま silently drop になる可能性あり）。
- 修正方針（具体案）: Webhook 対応ブロックのみで構成し直す（例: `section` ブロック＋`mrkdwn` で箇条書き生成、または `header` + `section` を繰り返す）。`rich_text` ブロックは使わない。
- 補足（仕様が不明な場合の質問）: Webhook ではなく `chat.postMessage` を使う想定なら権限・トークン管理方針を確認したい。

### [Severity: Medium] サマリーペイロードの URL ベースが未定義時に壊れる
- 対象: src/use-case/confluence-update-summary-job.ts:32-36 付近
- 何が問題か: `convertSearchResultsToSummaryPayload` に渡す `baseUrl` を `recentChangePages._links.base` のみから取得しており、値が無い場合に fallback しない。null/undefined のまま渡ると Slack メッセージ内のリンクが `undefined/pages/...` となり閲覧不可。
- どういう時に起きるか: Confluence の検索レスポンスが `_links.base` を含まない環境設定・バージョンでジョブを実行した場合。
- 影響: サマリー通知内のページリンク・差分リンクが全て無効になり、通知の実用性が損なわれる。
- 修正方針（具体案）: `_links.base ?? getEnvVariable("CONFLUENCE_URL")` などでベース URL をフォールバックさせ、空なら送信をスキップする等の保護を入れる。
- 補足（仕様が不明な場合の質問）: Confluence Server/DC で `_links.base` が常に返る保証があるか確認したい。

### [Severity: Medium] Confluence への書き込み系 API 呼び出しで Content-Type が `text/plain` になる
- 対象: src/clients/confluence-client.ts (callApi 経由), src/clients/http-client.ts (GAS 分岐)
- 何が問題か: `callApi` で JSON ボディを送る際に `Content-Type: application/json` を設定していないため、GAS 環境では `http-client` がデフォルトで `text/plain` を付与する。ページ作成・更新など書き込み API を追加実装した場合、Confluence が 415 などで拒否する恐れがある。
- どういう時に起きるか: `callApi` を POST/PUT で利用し、JSON オブジェクトを `requestBody` に渡したケース（将来の拡張や既存コード流用時）。
- 影響: 書き込み系 API が失敗し、機能追加時に原因不明の 4xx エラーに直面する可能性が高い。
- 修正方針（具体案）: `callApi` 側で JSON ボディを送る場合に `headers["Content-Type"] = "application/json"` を設定する。または `http-client` で文字列化前に `contentType` を JSON に強制する。
