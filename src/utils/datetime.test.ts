import { describe, it, expect } from "bun:test";
import { formatDateJST } from "./datetime";

describe("formatDateJST", () => {
  it("should format a Date object to JST string", () => {
    // UTC 2024-01-15 00:00:00 -> JST 2024-01-15 09:00
    const date = new Date("2024-01-15T00:00:00Z");
    const result = formatDateJST(date);
    expect(result).toBe("2024/01/15 09:00");
  });

  it("should format a ISO string to JST string", () => {
    // ISO文字列を入力として処理
    const result = formatDateJST("2024-06-20T15:30:00Z");
    // UTC 15:30 -> JST 00:30 (翌日)
    expect(result).toBe("2024/06/21 00:30");
  });

  it("should handle midnight UTC", () => {
    // UTC 0時 -> JST 9時
    const result = formatDateJST("2024-03-01T00:00:00Z");
    expect(result).toBe("2024/03/01 09:00");
  });

  it("should handle date crossing day boundary", () => {
    // UTC 18:00 -> JST 翌日3:00
    const result = formatDateJST("2024-12-31T18:00:00Z");
    expect(result).toBe("2025/01/01 03:00");
  });

  it("should handle date string with timezone offset", () => {
    // タイムゾーンオフセット付きの文字列
    const result = formatDateJST("2024-05-10T12:00:00+09:00");
    expect(result).toBe("2024/05/10 12:00");
  });

  it("should return current time when no argument is provided", () => {
    // 引数なしの場合、現在時刻を返す（具体的な値はテストしにくいのでフォーマットのみ確認）
    const result = formatDateJST();
    // YYYY/MM/DD HH:MM 形式であることを確認
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("should return current time when undefined is provided", () => {
    // undefined の場合も現在時刻を返す
    const result = formatDateJST(undefined);
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/);
  });

  it("should handle leap year date", () => {
    // うるう年の2月29日
    const result = formatDateJST("2024-02-29T12:00:00Z");
    expect(result).toBe("2024/02/29 21:00");
  });

  it("should format date at JST midnight", () => {
    // JST 0時ちょうど (UTC 15:00 前日)
    const result = formatDateJST("2024-07-14T15:00:00Z");
    expect(result).toBe("2024/07/15 00:00");
  });
});
