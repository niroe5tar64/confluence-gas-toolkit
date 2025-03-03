/**
 * 指定されたファイルに複数行の内容を書き込む。
 *
 * - **ローカル環境 (Node.js/Bun)**:
 *   - 改行を含むデータを `fs.writeFileSync()` で書き込む。
 *   - 必要に応じてディレクトリを作成する。
 * - **GAS 環境 (Google Drive)**:
 *   - 指定されたパスのフォルダを作成し、その中にファイルを作成または更新する。
 *   - `setContent()` を使用して改行を保持。
 *
 * @param {string} filePath - 書き込むファイルのパス (フォルダ構造を含む)
 * @param {string} content - 書き込むテキストデータ (改行を含む)
 * @throws {Error} - 無効なファイルパスや書き込みに失敗した場合
 *
 * @example
 * ```ts
 * writeFile("data/debug.log", "Line 1\nLine 2\nLine 3");
 * ```
 */
export function writeFile(filePath: string, content: string): void {
  if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
    // ローカル環境 (Node.js/Bun)
    const fs = require("node:fs");
    const path = require("node:path");
    const dirPath = path.dirname(filePath);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, content, "utf-8");
    return;
  }

  // GAS 環境
  const { folder, fileName } = getOrCreateFolderAndFileName(filePath);
  const files = folder.getFilesByName(fileName);

  if (files.hasNext()) {
    // 既存ファイルを更新
    const file = files.next();
    file.setContent(content);
    console.log(`File updated in Drive: ${file.getUrl()}`);
  } else {
    // 新規作成
    const file = folder.createFile(fileName, content);
    console.log(`File created in Drive: ${file.getUrl()}`);
  }
}

/**
 * 指定されたファイルの内容を複数行で読み込む。
 *
 * - **ローカル環境 (Node.js/Bun)**:
 *   - 指定したパスのファイルを読み込み、改行を含む文字列として返す。
 * - **GAS 環境 (Google Drive)**:
 *   - 指定されたパスのフォルダ内のファイルを検索し、内容を取得する。
 *   - `getBlob().getDataAsString()` を使用して改行を保持。
 *
 * @param {string} filePath - 読み込むファイルのパス (フォルダ構造を含む)
 * @param {"text" | "json"} fileType - 読み込むファイルの形式
 * @returns {object} - ファイルの内容 (存在しない場合は空配列)
 * @throws {Error} - 無効なファイルパスや読み取りに失敗した場合
 *
 * @example
 * ```ts
 * const content = readFile("data/debug.log");
 * console.log(content); // "Line 1\nLine 2\nLine 3"
 * ```
 */
export function readFile(filePath: string): object {
  let content = "";
  if (typeof process !== "undefined" && process.env.TARGET !== "GAS") {
    // ローカル環境 (Node.js/Bun)
    const fs = require("node:fs");
    if (!fs.existsSync(filePath)) {
      return [];
    }
    content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }
  // GAS 環境
  const { folder, fileName } = getOrCreateFolderAndFileName(filePath);
  const files = folder.getFilesByName(fileName);
  if (!files.hasNext()) {
    return [];
  }
  content = files.next().getBlob().getDataAsString();
  return JSON.parse(content);
}

/**
 * 指定されたファイルパスを解析し、対象のフォルダとファイル名を取得する。
 * GAS 環境では Google Drive 上でフォルダ構造を模倣する。
 *
 * @param {string} filePath - フォルダ階層を含むファイルパス
 * @returns {{ folder: GoogleAppsScript.Drive.Folder; fileName: string }} - 対象フォルダとファイル名
 * @throws {Error} - 無効なパスの場合
 *
 * @example
 * ```ts
 * const { folder, fileName } = getOrCreateFolderAndFileName("data/debug.log");
 * ```
 */
function getOrCreateFolderAndFileName(filePath: string): {
  folder: GoogleAppsScript.Drive.Folder;
  fileName: string;
} {
  const parts = filePath.split("/");

  if (parts.length === 0) {
    throw new Error("Invalid file path: empty string");
  }

  const fileName = parts.pop();
  if (!fileName) {
    throw new Error("Invalid file path: missing file name");
  }

  const folderPath = parts.join("/");
  let folder = DriveApp.getRootFolder();

  if (folderPath) {
    const folders = folderPath.split("/");
    for (const name of folders) {
      folder = getOrCreateFolder(folder, name);
    }
  }

  return { folder, fileName };
}

/**
 * 指定されたフォルダを取得し、存在しない場合は作成する。
 *
 * @param {GoogleAppsScript.Drive.Folder} parent - 親フォルダ
 * @param {string} name - 作成または取得するフォルダ名
 * @returns {GoogleAppsScript.Drive.Folder} - 取得または作成されたフォルダ
 *
 * @example
 * ```ts
 * const folder = getOrCreateFolder(DriveApp.getRootFolder(), "data");
 * ```
 */
function getOrCreateFolder(
  parent: GoogleAppsScript.Drive.Folder,
  name: string,
): GoogleAppsScript.Drive.Folder {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}
