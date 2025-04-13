// ./src/utils/collection.ts

/**
 * 配列を指定されたキーでグルーピングする関数
 *
 * @param items - グルーピング対象となる配列
 * @param getKey - 各要素からグルーピングキーを取り出す関数（例: item => item.id）
 * @returns グルーピングされた結果（キーごとの配列）
 *
 * @example
 * const users = [{ id: 1 }, { id: 2 }, { id: 1 }];
 * const grouped = groupByKey(users, user => user.id);
 * => {
 *   "1": [{ id: 1 }, { id: 1 }],
 *   "2": [{ id: 2 }]
 * }
 */
export function groupByKey<T>(
  items: T[],
  getKey: (item: T) => string | number,
): Record<string, T[]> {
  if (!Array.isArray(items)) {
    throw new TypeError("items must be an array");
  }

  return items.reduce<Record<string, T[]>>(
    (grouped, item) => {
      // 各要素からグルーピング用のキーを取り出して文字列に変換（Recordのキーとして使うため）
      const key = String(getKey(item));

      // まだキーが存在しなければ空の配列を初期化
      // ||= は「左辺が falsy（未定義など）なら右辺を代入」の意味
      grouped[key] ||= [];

      // キーに対応する配列に要素を追加
      grouped[key].push(item);

      // 次のループに渡すための累積オブジェクトを返す
      return grouped;
    },
    {}, // reduce関数の初期値: 空のオブジェクト
  );
}

/**
 * 複数の条件に基づいて任意の配列を安定的にソートする汎用関数。
 * 各ソート条件には、値を取得する関数（getValue）と昇順・降順の指定（order）を含めます。
 *
 * ソート優先度は `sortKeys` の配列順に適用されます。各値は `string`, `number`, `Date`, `null`, `undefined` のいずれかに限定されます。
 * `Date` 型は自動的に `getTime()` に変換されて比較されます。
 * `null` / `undefined` は常に末尾に並びます。
 *
 * @template T - 配列の要素型
 * @template U - 比較可能な値の型（string | number | Date | null | undefined）
 * @param items - ソート対象の配列（元の配列は変更されません）
 * @param sortKeys - ソート条件の配列。優先順位の高い順に並べてください。
 *                   各条件は値を取り出す `getValue` 関数と `'asc'` / `'desc'` の `order` を指定します。
 * @returns ソートされた新しい配列
 *
 * @example
 * const sorted = multiSortBy(users, [
 *   { getValue: (u) => u.age, order: "asc" },
 *   { getValue: (u) => u.name, order: "desc" },
 * ]);
 */
export function multiSortBy<T>(
  items: T[],
  sortKeys: Array<{
    getValue: (item: T) => string | number | Date | null | undefined;
    order: "asc" | "desc";
  }>,
): T[] {
  if (!Array.isArray(items)) {
    throw new TypeError("items must be an array");
  }

  return [...items].sort((a, b) => {
    for (const { getValue, order } of sortKeys) {
      const aRaw = getValue(a);
      const bRaw = getValue(b);

      // 比較用の値を準備（DateならgetTime、その他はそのまま）
      const aValue = aRaw instanceof Date ? aRaw.getTime() : aRaw;
      const bValue = bRaw instanceof Date ? bRaw.getTime() : bRaw;

      // null/undefined は後ろに送る
      if (aValue == null && bValue != null) return 1;
      if (aValue != null && bValue == null) return -1;
      if (aValue == null && bValue == null) continue;

      if (aValue != null && bValue != null) {
        if (aValue < bValue) return order === "asc" ? -1 : 1;
        if (aValue > bValue) return order === "asc" ? 1 : -1;
      }
    }
    return 0;
  });
}
