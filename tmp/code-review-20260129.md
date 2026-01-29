# コードレビュー (2026-01-29)

- **重大** Slack Webhook を GAS から送信する際の `Content-Type` が `text/plain` に強制される  
  - GAS 分岐では文字列ボディを送ると `contentType` を無条件に `text/plain` に設定しています（`src/clients/http-client.ts:33-49`）。一方で Slack 側は Incoming Webhook に `application/json` を要求しており、`contentType` が優先されるためヘッダーで `application/json` を指定しても無視されます。実際、`SlackClient.send` では JSON 文字列をボディにしているため、GAS 本番では 415 / `invalid_payload` になり通知が落ちる危険があります（Node 環境のテストでは検知できません）。  
  - 対応案: 文字列ボディの場合でも `options.headers["Content-Type"]` を尊重するか、既定で `application/json` をセットする。あるいは `SlackClient` からはオブジェクトを渡し、`http-client` 側で JSON 変換と `contentType` 設定を行う。

- **仕様不一致** GAS でのジョブ状態保存先がドキュメント記載と異なる  
  - ドキュメント（`docs/ARCHITECTURE.md:148-153`）では GAS 環境の永続化に PropertiesService を使うと明記されていますが、実装は `utils/file.ts` で DriveApp にファイルを書いています。Deploy 時に Drive 権限を付けないと `parseJobData` が毎回空配列を返し、タイムスタンプが永続化されず「毎回15分/1週間前から再スキャンする」動作に戻ってしまいます。  
  - 対応案: GAS 分岐を PropertiesService ベースに戻す（既存データ移行含む）、またはドキュメントと権限手順を Drive 依存に更新し、状態消失リスクを明記する。
