/**
 * Slack Block Kit の型定義。
 *
 * Slack の Block Kit に基づいた型定義を提供し、Slack Webhook 経由でメッセージを送信する際に
 * 型安全性を確保します。
 *
 * 参考:
 * - Slack Block Kit 公式ドキュメント
 *   https://api.slack.com/reference/block-kit/blocks
 */

/**
 * プレーンテキスト要素
 */
interface PlainText {
  type: "plain_text";
  text: string;
  emoji?: boolean;
}

/**
 * マークダウンテキスト要素
 */
interface Markdown {
  type: "mrkdwn";
  text: string;
  verbatim?: boolean;
}

/**
 * テキスト要素（PlainText または Markdown）
 */
type TextObject = PlainText | Markdown;

/**
 * ヘッダーブロック
 */
interface HeaderBlock {
  type: "header";
  text: PlainText;
  block_id?: string;
}

/**
 * セクションブロックのテキストプロパティ
 */
type SectionBlockText = TextObject;

/**
 * セクションブロックのフィールド
 */
interface Field {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

/**
 * セクションブロック
 */
interface SectionBlock {
  type: "section";
  text?: SectionBlockText;
  block_id?: string;
  fields?: Field[];
  accessory?: {
    type: string;
    [key: string]: unknown;
  };
}

/**
 * リッチテキストリンク要素
 */
interface RichTextLink {
  type: "link";
  url: string;
  text?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

/**
 * リッチテキスト要素
 */
interface RichTextText {
  type: "text";
  text: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    strike?: boolean;
    code?: boolean;
  };
}

/**
 * リッチテキスト内の要素の合計型
 */
export type RichTextElement = RichTextLink | RichTextText;

/**
 * リッチテキストセクション
 */
interface RichTextSection {
  type: "rich_text_section";
  elements: RichTextElement[];
}

/**
 * リッチテキストリスト
 */
interface RichTextList {
  type: "rich_text_list";
  style?: "bullet" | "ordered";
  indent?: number;
  border?: number;
  elements: RichTextSection[];
}

/**
 * リッチテキストブロック内の要素
 */
type RichTextBlockElement = RichTextSection | RichTextList;

/**
 * リッチテキストブロック
 */
interface RichTextBlock {
  type: "rich_text";
  elements: RichTextBlockElement[];
  block_id?: string;
}

/**
 * コンテキストブロック
 */
interface ContextBlock {
  type: "context";
  elements?: (PlainText | Markdown)[];
  block_id?: string;
}

/**
 * ディバイダーブロック
 */
interface DividerBlock {
  type: "divider";
  block_id?: string;
}

/**
 * すべてのブロック型
 */
type Block = HeaderBlock | SectionBlock | RichTextBlock | ContextBlock | DividerBlock;

/**
 * Slack Webhook 用のメッセージペイロード
 */
export namespace Slack {
  export type RichTextElement = RichTextLink | RichTextText;
  export interface MessagePayload {
    /** メッセージのテキスト（フォールバック用） */
    text?: string;
    /** Block Kit ブロック配列 */
    blocks?: Block[];
    /** スレッド内で返信する際のタイムスタンプ */
    thread_ts?: string;
    /** メッセージタイプ */
    mrkdwn?: boolean;
    /** その他の Webhook パラメータ */
    [key: string]: unknown;
  }
}
