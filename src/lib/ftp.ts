import { Client, FileInfo } from "basic-ftp";
import { PassThrough, Readable } from "node:stream";
import type { ServerConfig } from "./servers";
import { isImagePath, resolveSafePath, sanitizeRelativePath } from "./pathSafety";

export class UnsafePathError extends Error {
  constructor(message = "不正なパスが指定されました") {
    super(message);
    this.name = "UnsafePathError";
  }
}

export interface SearchResultItem {
  /** ベースディレクトリからの相対パス（posix区切り） */
  path: string;
  name: string;
  size: number;
  modifiedAt: string | null;
}

export interface SearchOptions {
  keyword: string;
  /** ベースディレクトリ配下の検索開始位置（未指定ならベースディレクトリ直下から） */
  subPath?: string;
  maxDepth: number;
  maxResults: number;
  maxScanned: number;
}

export interface SearchResult {
  items: SearchResultItem[];
  truncated: boolean;
  scannedCount: number;
}

const CONNECT_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 30000;

async function connectClient(server: ServerConfig, timeout: number): Promise<Client> {
  const client = new Client(timeout);
  await client.access({
    host: server.host,
    port: server.port,
    user: server.user,
    password: server.password,
    secure: server.secure,
  });
  return client;
}

export async function searchFiles(server: ServerConfig, options: SearchOptions): Promise<SearchResult> {
  const subPathSafe = sanitizeRelativePath(options.subPath ?? "");
  if (subPathSafe === null) {
    throw new UnsafePathError();
  }

  const client = await connectClient(server, CONNECT_TIMEOUT_MS);
  const items: SearchResultItem[] = [];
  let truncated = false;
  let scannedCount = 0;
  const keywordLower = options.keyword.toLowerCase();

  try {
    const startAbsDir = resolveSafePath(server.baseDir, subPathSafe);
    if (!startAbsDir) throw new UnsafePathError();

    const walk = async (absDir: string, relDir: string, depth: number): Promise<void> => {
      if (truncated) return;
      if (depth > options.maxDepth) return;

      let entries: FileInfo[];
      try {
        entries = await client.list(absDir);
      } catch {
        // 読み取れないディレクトリはスキップする
        return;
      }

      for (const entry of entries) {
        if (truncated) return;
        if (entry.name === "." || entry.name === "..") continue;

        scannedCount++;
        if (scannedCount > options.maxScanned) {
          truncated = true;
          return;
        }

        const entryRelPath = relDir ? `${relDir}/${entry.name}` : entry.name;

        if (entry.isDirectory) {
          const entryAbsPath = `${absDir.replace(/\/+$/, "")}/${entry.name}`;
          await walk(entryAbsPath, entryRelPath, depth + 1);
        } else if (entry.isFile) {
          if (isImagePath(entry.name) && entryRelPath.toLowerCase().includes(keywordLower)) {
            items.push({
              path: entryRelPath,
              name: entry.name,
              size: entry.size,
              modifiedAt: entry.modifiedAt ? entry.modifiedAt.toISOString() : null,
            });
            if (items.length >= options.maxResults) {
              truncated = true;
              return;
            }
          }
        }
      }
    };

    await walk(startAbsDir, subPathSafe, 0);
  } finally {
    client.close();
  }

  return { items, truncated, scannedCount };
}

/**
 * FTPサーバー上の画像ファイルをストリームとして取得する。
 * 呼び出し側がストリームを読み終える（またはエラーになる）まで裏で接続を保持し、
 * 完了後にFTP接続をクローズする。
 */
export async function fetchFileStream(server: ServerConfig, rawRelativePath: string): Promise<Readable> {
  const safeRelative = sanitizeRelativePath(rawRelativePath);
  if (safeRelative === null || !isImagePath(safeRelative)) {
    throw new UnsafePathError();
  }
  const absPath = resolveSafePath(server.baseDir, safeRelative);
  if (!absPath) throw new UnsafePathError();

  const client = await connectClient(server, DOWNLOAD_TIMEOUT_MS);
  const pass = new PassThrough();

  client
    .downloadTo(pass, absPath)
    .catch((err) => {
      pass.destroy(err instanceof Error ? err : new Error(String(err)));
    })
    .finally(() => {
      client.close();
    });

  return pass;
}
