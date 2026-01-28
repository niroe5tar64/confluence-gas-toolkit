import { describe, expect, it } from "bun:test";
import { groupByKey, multiSortBy } from "./collection";

describe("groupByKey", () => {
  it("should group items by a numeric key", () => {
    // 数値キーでグルーピングする基本的なケースをテスト
    const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const result = groupByKey(items, (item) => item.id);
    expect(result).toEqual({
      "1": [{ id: 1 }, { id: 1 }],
      "2": [{ id: 2 }],
    });
  });

  it("should group items by a string key", () => {
    // 文字列キーでグルーピングするケースをテスト
    const items = [{ type: "a" }, { type: "b" }, { type: "a" }];
    const result = groupByKey(items, (item) => item.type);
    expect(result).toEqual({
      a: [{ type: "a" }, { type: "a" }],
      b: [{ type: "b" }],
    });
  });

  it("should handle an empty array", () => {
    // 空の配列を渡した場合に、空のオブジェクトを返すことを確認
    const items: { id: number }[] = [];
    const result = groupByKey(items, (item) => item.id);
    expect(result).toEqual({});
  });

  it("should handle a key that does not exist", () => {
    // 存在しないキーを指定した場合に、`undefined` をキーとしてグルーピングされることを確認
    const items = [{ id: 1 }, { id: 2 }];
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const result = groupByKey(items, (item) => (item as any).nonExistentKey);
    expect(result).toEqual({
      undefined: [{ id: 1 }, { id: 2 }],
    });
  });

  it("should group items with mixed key types", () => {
    // 数値と文字列が混在するキーでグルーピングするケースをテスト
    const items = [{ key: 1 }, { key: "1" }, { key: 2 }];
    const result = groupByKey(items, (item) => item.key);
    expect(result).toEqual({
      "1": [{ key: 1 }, { key: "1" }],
      "2": [{ key: 2 }],
    });
  });
});

describe("multiSortBy", () => {
  it("should sort by a single key in ascending order", () => {
    // 年齢で昇順にソートする
    const users = [{ age: 30 }, { age: 20 }, { age: 40 }];
    const result = multiSortBy(users, [{ getValue: (u) => u.age, order: "asc" }]);
    expect(result).toEqual([{ age: 20 }, { age: 30 }, { age: 40 }]);
  });

  it("should sort by a single key in descending order", () => {
    // 年齢で降順にソートする
    const users = [{ age: 30 }, { age: 20 }, { age: 40 }];
    const result = multiSortBy(users, [{ getValue: (u) => u.age, order: "desc" }]);
    expect(result).toEqual([{ age: 40 }, { age: 30 }, { age: 20 }]);
  });

  it("should sort by multiple keys", () => {
    // 年齢で昇順、名前で降順にソートする
    const users = [
      { age: 30, name: "Alice" },
      { age: 20, name: "Bob" },
      { age: 30, name: "Charlie" },
    ];
    const result = multiSortBy(users, [
      { getValue: (u) => u.age, order: "asc" },
      { getValue: (u) => u.name, order: "desc" },
    ]);
    expect(result).toEqual([
      { age: 20, name: "Bob" },
      { age: 30, name: "Charlie" },
      { age: 30, name: "Alice" },
    ]);
  });

  it("should handle null and undefined values", () => {
    // null や undefined を後ろに送る
    const users = [{ age: 30 }, { age: null }, { age: 20 }, { age: undefined }];
    const result = multiSortBy(users, [{ getValue: (u) => u.age, order: "asc" }]);
    expect(result).toEqual([{ age: 20 }, { age: 30 }, { age: null }, { age: undefined }]);
  });

  it("should handle Date values", () => {
    // 日付で昇順にソートする
    const users = [
      { createdAt: new Date("2023-01-01") },
      { createdAt: new Date("2022-01-01") },
      { createdAt: new Date("2024-01-01") },
    ];
    const result = multiSortBy(users, [{ getValue: (u) => u.createdAt, order: "asc" }]);
    expect(result).toEqual([
      { createdAt: new Date("2022-01-01") },
      { createdAt: new Date("2023-01-01") },
      { createdAt: new Date("2024-01-01") },
    ]);
  });

  it("should return the original array if no sort keys are provided", () => {
    // ソート条件がない場合、元の配列をそのまま返す
    const users = [{ age: 30 }, { age: 20 }, { age: 40 }];
    const result = multiSortBy(users, []);
    expect(result).toEqual(users);
  });

  it("should handle an empty array", () => {
    // 空の配列を渡した場合、空の配列を返す
    const users: { age: number }[] = [];
    const result = multiSortBy(users, [{ getValue: (u) => u.age, order: "asc" }]);
    expect(result).toEqual([]);
  });

  it("should sort by nested keys", () => {
    // ネストしたキーでソートする
    const users = [{ profile: { age: 30 } }, { profile: { age: 20 } }, { profile: { age: 40 } }];
    const result = multiSortBy(users, [{ getValue: (u) => u.profile.age, order: "asc" }]);
    expect(result).toEqual([
      { profile: { age: 20 } },
      { profile: { age: 30 } },
      { profile: { age: 40 } },
    ]);
  });
});
