import { NextRequest, NextResponse } from "next/server";
import { getServerById } from "@/lib/servers";
import { searchFiles, UnsafePathError } from "@/lib/ftp";

export const runtime = "nodejs";
// Vercel Pro以上であれば maxDuration を伸ばせる（Hobbyプランは最大60秒）。
// 大量のファイルを再帰検索するとタイムアウトする可能性があるため、
// サブフォルダを指定して検索範囲を絞ることを推奨する。
export const maxDuration = 60;

const MAX_DEPTH = Number(process.env.SEARCH_MAX_DEPTH ?? 6);
const MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS ?? 100);
const MAX_SCANNED = Number(process.env.SEARCH_MAX_SCANNED ?? 5000);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId") ?? "";
  const keyword = (searchParams.get("keyword") ?? "").trim();
  const subPath = searchParams.get("subPath") ?? "";

  if (!serverId) {
    return NextResponse.json({ error: "serverId は必須です" }, { status: 400 });
  }
  if (keyword.length < 2) {
    return NextResponse.json({ error: "キーワードは2文字以上で入力してください" }, { status: 400 });
  }

  const server = getServerById(serverId);
  if (!server) {
    return NextResponse.json({ error: "指定されたサーバーが見つかりません" }, { status: 404 });
  }

  try {
    const result = await searchFiles(server, {
      keyword,
      subPath,
      maxDepth: MAX_DEPTH,
      maxResults: MAX_RESULTS,
      maxScanned: MAX_SCANNED,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      return NextResponse.json({ error: "不正なパスが指定されました" }, { status: 400 });
    }
    console.error("[search] failed", err);
    return NextResponse.json(
      { error: "検索中にエラーが発生しました。サーバー接続情報をご確認ください。", ...debugDetail(err) },
      { status: 502 }
    );
  }
}

/**
 * 環境変数 DEBUG_API_ERRORS=1 のときのみ、エラーの詳細をレスポンスに含める。
 * FTP接続の切り分け（タイムアウト/接続拒否/認証失敗など）をVercelのログを見ずに
 * 素早く行うためのデバッグ用途。本番の常時運用では無効にしておくことを推奨する。
 */
function debugDetail(err: unknown): { detail?: string } {
  if (process.env.DEBUG_API_ERRORS !== "1") return {};
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return { detail: `${err.name}: ${err.message}${code ? ` (code: ${code})` : ""}` };
  }
  return { detail: String(err) };
}
