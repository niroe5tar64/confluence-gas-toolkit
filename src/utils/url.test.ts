import { describe, expect, it } from "bun:test";
import { toQueryString } from "./url";

describe("toQueryString", () => {
  it("should convert a simple object to query string", () => {
    // 基本的なオブジェクトをクエリ文字列に変換
    const params = { foo: "bar", baz: "qux" };
    const result = toQueryString(params);
    expect(result).toBe("foo=bar&baz=qux");
  });

  it("should handle numeric values", () => {
    // 数値を文字列に変換して処理
    const params = { page: 1, limit: 10 };
    const result = toQueryString(params);
    expect(result).toBe("page=1&limit=10");
  });

  it("should handle boolean values", () => {
    // 真偽値を文字列に変換して処理
    const params = { active: true, deleted: false };
    const result = toQueryString(params);
    expect(result).toBe("active=true&deleted=false");
  });

  it("should exclude undefined values", () => {
    // undefined の値は除外される
    const params = { foo: "bar", baz: undefined, qux: "quux" };
    const result = toQueryString(params);
    expect(result).toBe("foo=bar&qux=quux");
  });

  it("should encode special characters", () => {
    // 特殊文字をURLエンコード
    const params = { query: "hello world", special: "foo&bar=baz" };
    const result = toQueryString(params);
    expect(result).toBe("query=hello%20world&special=foo%26bar%3Dbaz");
  });

  it("should encode Japanese characters", () => {
    // 日本語文字をURLエンコード
    const params = { title: "テスト", content: "日本語" };
    const result = toQueryString(params);
    expect(result).toBe(
      `title=${encodeURIComponent("テスト")}&content=${encodeURIComponent("日本語")}`,
    );
  });

  it("should handle an empty object", () => {
    // 空のオブジェクトは空文字列を返す
    const params = {};
    const result = toQueryString(params);
    expect(result).toBe("");
  });

  it("should handle object with only undefined values", () => {
    // すべてが undefined の場合は空文字列を返す
    const params = { foo: undefined, bar: undefined };
    const result = toQueryString(params);
    expect(result).toBe("");
  });

  it("should handle null values as string 'null'", () => {
    // null は文字列 "null" に変換される
    const params = { foo: null };
    const result = toQueryString(params);
    expect(result).toBe("foo=null");
  });

  it("should encode key names with special characters", () => {
    // キー名に特殊文字が含まれる場合もエンコード
    const params = { "foo bar": "value", "key=test": "data" };
    const result = toQueryString(params);
    expect(result).toBe("foo%20bar=value&key%3Dtest=data");
  });
});
