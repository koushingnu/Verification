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
      { error: "検索中にエラーが発生しました。サーバー接続情報をご確認ください。" },
      { status: 502 }
    );
  }
}
