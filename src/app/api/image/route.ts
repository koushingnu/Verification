import { NextRequest } from "next/server";
import { Readable } from "node:stream";
import path from "node:path";
import { getServerById } from "@/lib/servers";
import { fetchFileStream, UnsafePathError } from "@/lib/ftp";
import { isImagePath } from "@/lib/pathSafety";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId") ?? "";
  const filePath = searchParams.get("path") ?? "";
  const download = searchParams.get("download") === "1";

  const server = getServerById(serverId);
  if (!server) {
    return new Response("サーバーが見つかりません", { status: 404 });
  }
  if (!isImagePath(filePath)) {
    return new Response("許可されていないファイル形式です", { status: 400 });
  }

  try {
    const nodeStream = await fetchFileStream(server, filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const ext = path.posix.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const fileName = filePath.split("/").pop() ?? "download";
    const dispositionType = download ? "attachment" : "inline";

    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${dispositionType}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return new Response("不正なパスが指定されました", { status: 400 });
    }
    console.error("[image] failed", err);
    const detail = process.env.DEBUG_API_ERRORS === "1" ? `\n${describeError(err)}` : "";
    return new Response(`画像の取得に失敗しました${detail}`, { status: 502 });
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return `${err.name}: ${err.message}${code ? ` (code: ${code})` : ""}`;
  }
  return String(err);
}
